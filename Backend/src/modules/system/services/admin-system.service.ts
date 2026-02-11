import { Injectable } from '@nestjs/common';

import { TokenService } from '../../auth/services/token.service';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/schemas/user.schema';

@Injectable()
export class AdminSystemService {
  constructor(
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService,
  ) {}

  private async getAdminUserIds(): Promise<string[]> {
    const { items } = await this.usersService.listAllAdmin({
      role: UserRole.ADMIN,
      limit: 500,
      page: 1,
    });
    return items.map((u) => String(u._id));
  }

  private async getAdminUserMap(): Promise<Map<string, { email?: string; name?: string }>> {
    const { items } = await this.usersService.listAllAdmin({
      role: UserRole.ADMIN,
      limit: 500,
      page: 1,
    });
    const m = new Map<string, { email?: string; name?: string }>();
    for (const u of items) {
      m.set(String(u._id), { email: u.email, name: u.name });
    }
    return m;
  }

  async listAdminSessions(adminId?: string): Promise<{
    sessions: Array<{
      jti: string;
      userId: string;
      role: string;
      lastUsed: number;
      createdAt: number;
      userAgent?: string;
      ip?: string;
      email?: string;
      name?: string;
    }>;
  }> {
    const adminIds = adminId
      ? [adminId]
      : await this.getAdminUserIds();

    const userMap = await this.getAdminUserMap();

    const sessions: Array<{
      jti: string;
      userId: string;
      role: string;
      lastUsed: number;
      createdAt: number;
      userAgent?: string;
      ip?: string;
      email?: string;
      name?: string;
    }> = [];

    for (const uid of adminIds) {
      const list = await this.tokenService.listSessionsForUser(uid);
      const userInfo = userMap.get(uid);
      for (const s of list) {
        sessions.push({
          jti: s.jti,
          userId: s.userId,
          role: s.role,
          lastUsed: s.lastUsed,
          createdAt: s.createdAt,
          userAgent: s.userAgent,
          ip: s.ip,
          email: userInfo?.email,
          name: userInfo?.name,
        });
      }
    }

    sessions.sort((a, b) => b.lastUsed - a.lastUsed);
    return { sessions };
  }

  async revokeSessionByJti(jti: string): Promise<boolean> {
    const list = await this.listAdminSessions();
    const found = list.sessions.some((s) => s.jti === jti);
    if (!found) return false;
    await this.tokenService.revokeSessionByJti(jti);
    return true;
  }

  async triggerBackup(actorId: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    const backupUrl = process.env.BACKUP_TRIGGER_URL;
    if (!backupUrl?.trim()) {
      return {
        success: false,
        message: 'آلية النسخ الاحتياطي غير مُفعّلة (BACKUP_TRIGGER_URL غير معيّن)',
      };
    }

    try {
      const res = await fetch(backupUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggeredBy: actorId, at: new Date().toISOString() }),
      });
      if (!res.ok) {
        return { success: false, message: `طلب النسخ الاحتياطي فشل: ${res.status}` };
      }
      return { success: true, message: 'تم استدعاء النسخ الاحتياطي' };
    } catch (e) {
      return {
        success: false,
        message: `خطأ في الاتصال بآلية النسخ الاحتياطي: ${(e as Error).message}`,
      };
    }
  }
}
