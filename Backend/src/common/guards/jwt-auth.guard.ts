// src/common/guards/jwt-auth.guard.ts
import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

const PUBLIC_PATHS = [
  '/metrics',
  '/health',
  '/api/health',
  '/uploads',
  '/api/docs',
  '/api/docs-json',
];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly jwtService: JwtService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1) احترام @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // 2) Allowlist لمسارات عامة (مثل /metrics التي لا يمكن تزيينها)
    if (context.getType<'http'>() === 'http') {
      const req = context.switchToHttp().getRequest<Request>();
      const url = (req.originalUrl || req.url || '').split('?')[0];

      if (PUBLIC_PATHS.some((p) => url === p || url.startsWith(p + '/'))) {
        return true;
      }
    }

    // 3) تشغيل التحقق الأساسي من JWT
    const basicResult = await super.canActivate(context);
    if (!basicResult) {
      return false;
    }

    // ✅ C3: التحقق من blacklist ووجود الجلسة في Redis
    if (context.getType<'http'>() === 'http') {
      const req = context.switchToHttp().getRequest<Request>();
      const token = this.extractTokenFromRequest(req);

      if (token) {
        const isValid = await this.validateTokenSession(token);
        if (!isValid) {
          throw new UnauthorizedException('Session expired or revoked');
        }
      }
    }

    return true;
  }

  /**
   * استخراج التوكن من الطلب
   */
  private extractTokenFromRequest(req: Request): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // التحقق من الكوكيز إذا كان مفعل
    const cookieToken = req.cookies?.accessToken;
    if (cookieToken) {
      return cookieToken;
    }

    return null;
  }

  /**
   * ✅ C3: التحقق من صحة التوكن والجلسة
   */
  private async validateTokenSession(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (!decoded?.jti) {
        return false;
      }
      const iat = (decoded?.iat || 0) * 1000;
      const pwdAt = await this.cacheManager.get<number>(
        `pwdChangedAt:${decoded?.sub}`,
      );
      if (pwdAt && iat < pwdAt) return false;
      // التحقق من القائمة السوداء
      const blacklistKey = `bl:${decoded.jti}`;
      const isBlacklisted = await this.cacheManager.get(blacklistKey);

      if (isBlacklisted) {
        return false;
      }

      // للـ Access Token، نحتاج فقط للتحقق من blacklist
      // الجلسة تُحفظ مع Refresh Token JTI فقط
      return true;
    } catch (error) {
      return false;
    }
  }
}
