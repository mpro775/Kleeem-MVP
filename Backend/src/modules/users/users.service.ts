// src/modules/users/users.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';

import { UserNotFoundError } from '../../common/errors/business-errors';
import { TranslationService } from '../../common/services/translation.service';
import { toCsv } from '../../common/utils/csv.utils';

import type { CreateUserDto } from './dto/create-user.dto';
import type { GetUsersDto } from './dto/get-users.dto';
import type { NotificationsPrefsDto } from './dto/notifications-prefs.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type {
  UsersRepository,
  ListAllAdminParams,
  StatsAdminResult,
  UserAdminLean,
} from './repositories/users.repository';
import type { UserDocument, UserRole } from './schemas/user.schema';
import type { UserLean } from './types';
import type { PaginationResult } from '../../common/dto/pagination.dto';

/** util: تحويل آمن إلى ObjectId */
function toObjectId(id: string): Types.ObjectId {
  return new Types.ObjectId(id);
}

/** تفضيلات افتراضية لتجنّب القيم السحرية داخل المنطق */
function defaultPrefs(): NotificationsPrefsDto {
  return {
    channels: { inApp: true, email: true, telegram: false, whatsapp: false },
    topics: {
      syncFailed: true,
      syncCompleted: true,
      webhookFailed: true,
      embeddingsCompleted: true,
      missingResponsesDigest: 'daily',
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'Asia/Aden',
    },
  };
}

const USERS_EXPORT_LIMIT = 5000;

@Injectable()
export class UsersService {
  constructor(
    @Inject('UsersRepository') private readonly repo: UsersRepository,
    private readonly translationService: TranslationService,
  ) {}

  // إنشاء يعيد وثيقة (ليس lean)
  async create(createDto: CreateUserDto): Promise<UserDocument> {
    return this.repo.create(createDto);
  }

  // قراءة متعددة: Lean
  async findAll(): Promise<UserLean[]> {
    return this.repo.findAll();
  }

  async listAllAdmin(
    params: ListAllAdminParams,
  ): Promise<{ items: UserAdminLean[]; total: number }> {
    return this.repo.listAllAdmin(params);
  }

  async getStatsAdmin(): Promise<StatsAdminResult> {
    return this.repo.statsAdmin();
  }

  async getTrendsAdmin(
    period: '7d' | '30d',
  ): Promise<{ date: string; count: number }[]> {
    return this.repo.getTrendsAdmin(period);
  }

  async getTrendsByDateRange(
    from: string,
    to: string,
  ): Promise<{ date: string; count: number }[]> {
    return this.repo.getTrendsByDateRange(from, to);
  }

  async exportCsv(params: {
    role?: UserRole;
    active?: boolean;
    includeDeleted?: boolean;
  }): Promise<string> {
    const { items } = await this.listAllAdmin({
      limit: USERS_EXPORT_LIMIT,
      page: 1,
      ...params,
    });
    const headers = [
      'id',
      'email',
      'name',
      'role',
      'active',
      'emailVerified',
      'merchantId',
      'createdAt',
    ];
    const rows = items.map((u) => [
      u._id ?? '',
      u.email ?? '',
      u.name ?? '',
      u.role ?? '',
      u.active ?? '',
      u.emailVerified ?? '',
      u.merchantId ?? '',
      u.createdAt ? new Date(u.createdAt).toISOString() : '',
    ]);
    return toCsv(headers, rows);
  }

  async updateAdmin(
    id: string,
    dto: {
      role?: UserRole;
      active?: boolean;
      reason?: string;
      merchantId?: string | null;
    },
    actor?: { userId: string },
  ): Promise<UserDocument> {
    const _id = toObjectId(id);
    const updated = await this.repo.updateAdmin(_id, dto, actor);
    if (!updated) throw new UserNotFoundError(id);
    return updated;
  }

  // قراءة مفردة: Lean
  async findOne(id: string): Promise<UserLean> {
    const _id = toObjectId(id);
    const user = await this.repo.findByIdLean(_id);
    if (!user) throw new UserNotFoundError(id);
    // user هنا Lean، ومُعرّفات قد تكون ObjectId أو string بحسب التنفيذ؛
    // نفترض أن الـ repo يعيد UserLean متّسقًا (كما أصلحناه سابقًا).
    return user;
  }

  // تحديث يعيد وثيقة (ليس lean)
  async update(id: string, updateDto: UpdateUserDto): Promise<UserDocument> {
    const _id = toObjectId(id);
    const updated = await this.repo.updateById(_id, updateDto);
    if (!updated) throw new UserNotFoundError(id);
    return updated;
  }

  // حذف ناعم: يُطابق Promise<void>
  async remove(id: string): Promise<void> {
    const _id = toObjectId(id);
    const user = await this.repo.softDeleteById(_id);
    if (!user) throw new UserNotFoundError(id);

    // رسالة ترجمة يمكن تمريرها إلى طبقة أعلى (Controller) إن لزم عبر حدث/إشعار.
    // هنا نحافظ على التوقيع Promise<void> كما هو.
    this.translationService.translate('users.messages.userDeleted');
  }

  async setFirstLoginFalse(userId: string): Promise<void> {
    const _id = toObjectId(userId);
    const updated = await this.repo.setFirstLoginFalse(_id);
    if (!updated) throw new UserNotFoundError(userId);
  }

  async getNotificationsPrefs(id: string): Promise<NotificationsPrefsDto> {
    const _id = toObjectId(id);
    const prefs = await this.repo.getNotificationsPrefs(_id);
    return prefs ?? defaultPrefs();
  }

  async updateNotificationsPrefs(
    id: string,
    dto: NotificationsPrefsDto,
  ): Promise<NotificationsPrefsDto> {
    const _id = toObjectId(id);
    const prefs = await this.repo.updateNotificationsPrefs(_id, dto);
    if (!prefs) throw new UserNotFoundError(id);
    return prefs;
  }

  // ===== Cursor Pagination =====
  async getUsers(dto: GetUsersDto): Promise<PaginationResult<UserLean>> {
    return this.repo.list(dto);
  }

  async searchUsers(
    query: string,
    dto: GetUsersDto,
  ): Promise<PaginationResult<UserLean>> {
    return this.repo.list({ ...dto, search: query });
  }

  async getUsersByMerchant(
    merchantId: string,
    dto: GetUsersDto,
  ): Promise<PaginationResult<UserLean>> {
    return this.repo.list({ ...dto, merchantId });
  }
}
