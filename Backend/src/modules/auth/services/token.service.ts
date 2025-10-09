// external imports
import { randomUUID, createHash, randomBytes } from 'crypto';

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  JwtService,
  type JwtVerifyOptions,
  type JwtSignOptions,
} from '@nestjs/jwt';
// internal imports (ثابتة/أنواع/مستودعات)
import {
  MS_PER_SECOND,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
} from 'src/common/constants/common';

import {
  SessionData,
  SessionStore,
} from '../repositories/session-store.repository';

// ====== أنواع صارمة ======
export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
  merchantId?: string | null;

  // قياسية لـ JWT
  sub: string;
  iat?: number;
  exp?: number;
  jti?: string;
  iss?: string;
  aud?: string;

  // توسيعات مستقبلية إن لزم
  [key: string]: unknown;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ====== ثوابت واضحة ======
const CSRF_TOKEN_LENGTH = 32; // bytes → 64-char hex
const SECONDS_PER_MINUTE = 60;

// ====== حراس وأنماط مساعدة ======
/** يتحقق أن القيمة كائن يحوي jti كنص */
function hasJti(value: unknown): value is { jti: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'jti' in value &&
    typeof (value as Record<string, unknown>).jti === 'string'
  );
}

/** يستخرج jti بأمان من نتيجة decode (قد تكون string | object | null) */
function extractJti(decoded: unknown): string | null {
  return hasJti(decoded) ? decoded.jti : null;
}

@Injectable()
export class TokenService {
  private readonly ACCESS_TOKEN_TTL: number;
  private readonly REFRESH_TOKEN_TTL: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Inject('SessionStore') private readonly store: SessionStore,
  ) {
    this.ACCESS_TOKEN_TTL = this.parseTimeToSeconds(
      this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
    );
    this.REFRESH_TOKEN_TTL = this.parseTimeToSeconds(
      this.config.get<string>('JWT_REFRESH_TTL') ?? '7d',
    );
  }

  /** ينشئ CSRF token عشوائيًا (hex بطول 64 حرفًا) */
  private generateCsrfToken(): string {
    return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  }

  /** يهشّ الـ refresh token مع ملح ثابت من الإعدادات */
  private hashRefreshToken(token: string): string {
    const salt =
      this.config.get<string>('JWT_REFRESH_SALT') ??
      'default-salt-change-in-production';
    return createHash('sha256')
      .update(token + salt)
      .digest('hex');
  }

  /** يحوّل صيغة مثل 15m/7d إلى ثواني */
  private parseTimeToSeconds(this: void, timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) throw new Error(`Invalid time format: ${timeStr}`);

    const value = Number.parseInt(match[1], 10);
    const unit = match[2] as 's' | 'm' | 'h' | 'd';

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * SECONDS_PER_MINUTE;
      case 'h':
        return value * SECONDS_PER_HOUR;
      case 'd':
        return value * SECONDS_PER_DAY;
      default:
        // لن نصل هنا بسبب الـ regex لكن لأمان إضافي
        throw new Error(`Unknown time unit: ${unit as string}`);
    }
  }

  /** يبني Access Token فقط ويعيد الـ jti لاستخدامه في قوائم منع الإساءة */
  createAccessOnly(payload: {
    userId: string;
    role: JwtPayload['role'];
    merchantId?: string | null;
  }): { accessToken: string; jti: string } {
    const jti = randomUUID();

    const claims: Pick<JwtPayload, 'sub' | 'role' | 'merchantId' | 'jti'> & {
      typ: 'access';
    } = {
      sub: payload.userId,
      role: payload.role,
      merchantId: payload.merchantId ?? null,
      jti,
      typ: 'access',
    };

    const signOptions: JwtSignOptions = {
      issuer: this.config.get<string>('JWT_ISSUER'),
      audience: this.config.get<string>('JWT_AUDIENCE'),
      algorithm: 'HS256',
      expiresIn: '15m',
    };

    const accessToken = this.jwtService.sign(claims, signOptions);
    return { accessToken, jti };
  }

  /** ينشئ زوج توكنات (Access/Refresh) ويخزّن جلسة آمنة */
  async createTokenPair(
    payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti' | 'iss' | 'aud'>,
    sessionInfo?: { userAgent?: string; ip?: string; csrfToken?: string },
  ): Promise<TokenPair> {
    const refreshJti = randomUUID();
    const accessJti = randomUUID();
    const now = Math.floor(Date.now() / MS_PER_SECOND);

    const accessPayload: JwtPayload = {
      ...payload,
      userId: payload.userId as string,
      role: payload.role as JwtPayload['role'],
      sub: payload.userId as string,
      jti: accessJti,
      iat: now,
      exp: now + this.ACCESS_TOKEN_TTL,
    };
    const refreshPayload: JwtPayload = {
      ...payload,
      userId: payload.userId as string,
      role: payload.role as JwtPayload['role'],
      sub: payload.userId as string,
      jti: refreshJti,
      iat: now,
      exp: now + this.REFRESH_TOKEN_TTL,
    };

    const commonSign: JwtSignOptions = {
      issuer: this.config.get<string>('JWT_ISSUER'),
      audience: this.config.get<string>('JWT_AUDIENCE'),
      algorithm: 'HS256',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      ...commonSign,
      expiresIn: this.ACCESS_TOKEN_TTL,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      ...commonSign,
      expiresIn: this.REFRESH_TOKEN_TTL,
    });

    const sessionData: SessionData = {
      userId: payload.userId as string,
      role: payload.role as string,
      merchantId: payload.merchantId as string | null,
      createdAt: now,
      lastUsed: now,
      ...(sessionInfo?.userAgent && { userAgent: sessionInfo.userAgent }),
      ...(sessionInfo?.ip && { ip: sessionInfo.ip }),
      csrfToken: sessionInfo?.csrfToken ?? this.generateCsrfToken(),
      refreshTokenHash: this.hashRefreshToken(refreshToken),
    };

    await this.store.setSession(
      refreshJti,
      sessionData,
      this.REFRESH_TOKEN_TTL,
    );
    await this.store.addUserSession(
      payload.userId as string,
      refreshJti,
      this.REFRESH_TOKEN_TTL,
    );

    return { accessToken, refreshToken };
  }

  /** يحدّث الزوج عبر refresh token مع تحققات أمان صارمة */
  async refreshTokens(
    refreshToken: string,
    sessionInfo?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    try {
      const verified = this.verifyRefreshToken(refreshToken);
      const jti = verified.jti;
      if (!jti) throw new UnauthorizedException('Refresh token missing JTI');

      const sess = await this.getValidSession(jti);
      await this.checkTokenReuse(sess, refreshToken);

      const csrfToken = await this.getCsrfToken(jti);
      await this.revokeRefreshToken(jti);

      const newTokens = await this.createTokenPair(
        {
          userId: verified.userId,
          role: verified.role,
          merchantId: verified.merchantId ?? null,
          sub: verified.userId,
        },
        { ...sessionInfo, csrfToken },
      );

      await this.updateSessionLastUsed(newTokens.refreshToken);
      return newTokens;
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /** إلغاء جلسة Refresh محددة وإضافتها للقائمة السوداء */
  async revokeRefreshToken(jti: string): Promise<void> {
    await this.store.deleteSession(jti);
    await this.store.addToBlacklist(jti, this.REFRESH_TOKEN_TTL);
  }

  /** يتحقق من الـ refresh token ويؤكد تطابق JTI بين decode و verify */
  private verifyRefreshToken(refreshToken: string): JwtPayload {
    const decodedUnknown: unknown = this.jwtService.decode(refreshToken);
    const decodedJti = extractJti(decodedUnknown);
    if (!decodedJti) {
      throw new UnauthorizedException('Invalid refresh token format');
    }

    const secret = this.config.get<string>('JWT_SECRET');
    const issuer = this.config.get<string>('JWT_ISSUER');
    const audience = this.config.get<string>('JWT_AUDIENCE');

    const verifyOptions: JwtVerifyOptions = {
      ...(secret && { secret }),
      ...(issuer && { issuer }),
      ...(audience && { audience }),
    };

    const verifiedPayload = this.jwtService.verify<JwtPayload>(
      refreshToken,
      verifyOptions,
    );
    if (typeof verifiedPayload?.jti !== 'string') {
      throw new UnauthorizedException('Token payload missing JTI');
    }
    if (verifiedPayload.jti !== decodedJti) {
      throw new UnauthorizedException('Token JTI mismatch');
    }
    return verifiedPayload;
  }

  /** يجلب جلسة صالحة وإلا يرمي Unauthorized */
  private async getValidSession(jti: string): Promise<SessionData> {
    const sess = await this.store.getSession(jti);
    if (!sess) throw new UnauthorizedException('Session expired or revoked');
    return sess;
  }

  /** يتحقق من إعادة استخدام التوكن (سرقة) بإعادة حساب الهاش */
  private async checkTokenReuse(
    sess: SessionData,
    refreshToken: string,
  ): Promise<void> {
    const tokenHash = this.hashRefreshToken(refreshToken);
    if (sess.refreshTokenHash !== tokenHash) {
      await this.revokeAllUserSessions(sess.userId);
      throw new UnauthorizedException('Token has been compromised');
    }
  }

  /** يجلب CSRF token للجلسة السابقة أو ينشئ واحدًا */
  private async getCsrfToken(jti: string): Promise<string> {
    const oldSession = await this.store.getSession(jti);
    return oldSession?.csrfToken ?? this.generateCsrfToken();
  }

  /** يحدّث lastUsed للجلسة المرتبطة بالـ refresh token الجديد */
  private async updateSessionLastUsed(refreshToken: string): Promise<void> {
    const decodedUnknown: unknown = this.jwtService.decode(refreshToken);
    const jti = extractJti(decodedUnknown);
    if (!jti) return;

    const newSession = await this.store.getSession(jti);
    if (!newSession) return;

    newSession.lastUsed = Math.floor(Date.now() / MS_PER_SECOND);
    await this.store.setSession(jti, newSession, this.REFRESH_TOKEN_TTL);
  }

  /** إلغاء كل جلسات المستخدم وإفراغ مؤشّر جلساته */
  async revokeAllUserSessions(userId: string): Promise<void> {
    const all = await this.store.getUserSessions(userId);
    for (const jti of all) {
      await this.revokeRefreshToken(jti);
    }
    await this.store.clearUserSessions(userId);
  }

  /** حظر access jti (للتسجيل خروج فوري) */
  async blacklistAccessJti(jti: string, ttlSeconds: number): Promise<void> {
    await this.store.addToBlacklist(jti, ttlSeconds);
  }

  /** يتحقق من صلاحية الـ access token مع التأكد من عدم وجوده في القائمة السوداء */
  async validateAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = this.config.get<string>('JWT_SECRET');
      const issuer = this.config.get<string>('JWT_ISSUER');
      const audience = this.config.get<string>('JWT_AUDIENCE');

      const decoded = this.jwtService.verify<JwtPayload>(token, {
        ...(secret && { secret }),
        ...(issuer && { issuer }),
        ...(audience && { audience }),
      });

      if (typeof decoded?.jti !== 'string') return null;

      const blacklisted = await this.store.isBlacklisted(decoded.jti);
      if (blacklisted) return null;

      return decoded;
    } catch {
      return null;
    }
  }

  /** يتحقق من الجلسة ويحدّث lastUsed و TTL */
  async validateSession(jti: string): Promise<SessionData | null> {
    const sess = await this.store.getSession(jti);
    if (!sess) return null;

    sess.lastUsed = Math.floor(Date.now() / MS_PER_SECOND);
    await this.store.setSession(jti, sess, this.REFRESH_TOKEN_TTL);
    return sess;
  }

  /** يعيد CSRF token للجلسة (إن وجد) */
  async getSessionCsrfToken(jti: string): Promise<string | null> {
    const session = await this.store.getSession(jti);
    return session?.csrfToken ?? null;
  }
}
