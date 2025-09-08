// src/modules/auth/services/token.service.ts
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
  merchantId?: string | null;
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID للتتبع والإبطال
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SessionData {
  userId: string;
  role: string;
  merchantId?: string | null;
  createdAt: number;
  lastUsed: number;
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class TokenService {
  private readonly ACCESS_TOKEN_TTL: number;
  private readonly REFRESH_TOKEN_TTL: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    // ✅ C1: إعداد TTL من البيئة
    this.ACCESS_TOKEN_TTL = this.parseTimeToSeconds(
      this.config.get<string>('JWT_ACCESS_TTL') || '15m',
    );
    this.REFRESH_TOKEN_TTL = this.parseTimeToSeconds(
      this.config.get<string>('JWT_REFRESH_TTL') || '7d',
    );
  }

  /**
   * تحويل وقت من صيغة نصية إلى ثواني
   */
  private parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid time format: ${timeStr}`);

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  /**
   * ✅ C1: إنشاء زوج التوكنات مع حفظ الجلسة في Redis
   */
  async createTokenPair(
    payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>,
    sessionInfo?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    const refreshJti = randomUUID();
    const accessJti = randomUUID();

    const now = Math.floor(Date.now() / 1000);

    // إنشاء Access Token
    const accessPayload: JwtPayload = {
      ...payload,
      jti: accessJti,
      iat: now,
      exp: now + this.ACCESS_TOKEN_TTL,
    };

    // إنشاء Refresh Token
    const refreshPayload: JwtPayload = {
      ...payload,
      jti: refreshJti,
      iat: now,
      exp: now + this.REFRESH_TOKEN_TTL,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.REFRESH_TOKEN_TTL,
    });

    // ✅ حفظ جلسة في Redis
    const sessionData: SessionData = {
      userId: payload.userId,
      role: payload.role,
      merchantId: payload.merchantId,
      createdAt: now,
      lastUsed: now,
      userAgent: sessionInfo?.userAgent,
      ip: sessionInfo?.ip,
    };

    await this.cacheManager.set(
      `sess:${refreshJti}`,
      JSON.stringify(sessionData),
      this.REFRESH_TOKEN_TTL * 1000, // Redis TTL in milliseconds
    );

    return { accessToken, refreshToken };
  }

  /**
   * ✅ C1: تدوير Refresh Token مع إبطال القديم
   */
  async refreshTokens(
    refreshToken: string,
    sessionInfo?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    try {
      // فك تشفير الرمز دون التحقق من انتهاء الصلاحية أولاً
      const decoded = this.jwtService.decode(refreshToken) as JwtPayload;
      if (!decoded?.jti) {
        throw new UnauthorizedException('Invalid refresh token format');
      }

      // التحقق من وجود الجلسة في Redis
      const sessionKey = `sess:${decoded.jti}`;
      const sessionDataStr = await this.cacheManager.get<string>(sessionKey);

      if (!sessionDataStr) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      // التحقق من صحة التوكن
      const verified = this.jwtService.verify(refreshToken) as JwtPayload;

      // التحقق من أن JTI متطابق
      if (verified.jti !== decoded.jti) {
        throw new UnauthorizedException('Token JTI mismatch');
      }

      // ✅ إبطال التوكن القديم
      await this.revokeRefreshToken(decoded.jti);

      // إنشاء زوج جديد
      const sessionData: SessionData = JSON.parse(sessionDataStr);
      const newTokens = await this.createTokenPair(
        {
          userId: verified.userId,
          role: verified.role,
          merchantId: verified.merchantId,
        },
        sessionInfo,
      );

      return newTokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * ✅ إبطال Refresh Token محدد
   */
  async revokeRefreshToken(jti: string): Promise<void> {
    const sessionKey = `sess:${jti}`;
    const blacklistKey = `bl:${jti}`;

    // حذف الجلسة من Redis
    await this.cacheManager.del(sessionKey);

    // إضافة إلى القائمة السوداء
    await this.cacheManager.set(
      blacklistKey,
      'revoked',
      this.REFRESH_TOKEN_TTL * 1000,
    );
  }

  /**
   * ✅ إبطال جميع جلسات المستخدم
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    // البحث عن جميع الجلسات للمستخدم
    // ملاحظة: Redis لا يدعم pattern search مباشرة في cache-manager
    // يمكن تحسين هذا باستخدام Redis client مباشرة أو تتبع الجلسات بطريقة أخرى

    // حل بديل: نحتفظ بقائمة الجلسات لكل مستخدم
    const userSessionsKey = `user_sessions:${userId}`;
    const sessionsStr = await this.cacheManager.get<string>(userSessionsKey);

    if (sessionsStr) {
      const sessions: string[] = JSON.parse(sessionsStr);

      // إبطال كل جلسة
      for (const jti of sessions) {
        await this.revokeRefreshToken(jti);
      }

      // حذف قائمة الجلسات
      await this.cacheManager.del(userSessionsKey);
    }
  }

  /**
   * ✅ التحقق من صحة Access Token وحالة الجلسة
   */
  async validateAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const decoded = this.jwtService.verify(token) as JwtPayload;

      if (!decoded.jti) {
        return null;
      }

      // التحقق من القائمة السوداء
      const blacklistKey = `bl:${decoded.jti}`;
      const isBlacklisted = await this.cacheManager.get(blacklistKey);

      if (isBlacklisted) {
        return null;
      }

      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * ✅ التحقق من وجود الجلسة في Redis
   */
  async validateSession(jti: string): Promise<SessionData | null> {
    const sessionKey = `sess:${jti}`;
    const sessionDataStr = await this.cacheManager.get<string>(sessionKey);

    if (!sessionDataStr) {
      return null;
    }

    try {
      const sessionData: SessionData = JSON.parse(sessionDataStr);

      // تحديث آخر استخدام
      sessionData.lastUsed = Math.floor(Date.now() / 1000);
      await this.cacheManager.set(
        sessionKey,
        JSON.stringify(sessionData),
        this.REFRESH_TOKEN_TTL * 1000,
      );

      return sessionData;
    } catch (error) {
      return null;
    }
  }

  /**
   * ✅ إضافة جلسة إلى قائمة جلسات المستخدم
   */
  private async addToUserSessions(userId: string, jti: string): Promise<void> {
    const userSessionsKey = `user_sessions:${userId}`;
    const sessionsStr = await this.cacheManager.get<string>(userSessionsKey);

    let sessions: string[] = [];
    if (sessionsStr) {
      sessions = JSON.parse(sessionsStr);
    }

    sessions.push(jti);

    await this.cacheManager.set(
      userSessionsKey,
      JSON.stringify(sessions),
      this.REFRESH_TOKEN_TTL * 1000,
    );
  }
}
