import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  SessionData,
  SessionStore,
} from '../repositories/session-store.repository';

export interface JwtPayload {
  userId: string;
  role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
  merchantId?: string | null;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
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
      this.config.get<string>('JWT_ACCESS_TTL') || '15m',
    );
    this.REFRESH_TOKEN_TTL = this.parseTimeToSeconds(
      this.config.get<string>('JWT_REFRESH_TTL') || '7d',
    );
  }

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
  async createAccessOnly(payload: {
    userId: string;
    role: string;
    merchantId?: string | null;
  }) {
    const jti = randomUUID();
    const claims = {
      sub: payload.userId,
      role: payload.role,
      merchantId: payload.merchantId ?? null,
      jti,
      typ: 'access',
    };
    const accessToken = this.jwtService.sign(claims, {
      expiresIn: '15m',
      issuer: this.config.get('JWT_ISSUER'),
      audience: this.config.get('JWT_AUDIENCE'),
    });
    return { accessToken, jti };
  }
  async createTokenPair(
    payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>,
    sessionInfo?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    const refreshJti = randomUUID();
    const accessJti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const accessPayload: JwtPayload = {
      ...payload,
      jti: accessJti,
      iat: now,
      exp: now + this.ACCESS_TOKEN_TTL,
    };
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

    const sessionData: SessionData = {
      userId: payload.userId,
      role: payload.role,
      merchantId: payload.merchantId,
      createdAt: now,
      lastUsed: now,
      userAgent: sessionInfo?.userAgent,
      ip: sessionInfo?.ip,
    };

    await this.store.setSession(
      refreshJti,
      sessionData,
      this.REFRESH_TOKEN_TTL,
    );
    await this.store.addUserSession(
      payload.userId,
      refreshJti,
      this.REFRESH_TOKEN_TTL,
    );

    return { accessToken, refreshToken };
  }

  async refreshTokens(
    refreshToken: string,
    sessionInfo?: { userAgent?: string; ip?: string },
  ): Promise<TokenPair> {
    try {
      const decoded = this.jwtService.decode(refreshToken) as JwtPayload;
      if (!decoded?.jti)
        throw new UnauthorizedException('Invalid refresh token format');

      const sess = await this.store.getSession(decoded.jti);
      if (!sess) throw new UnauthorizedException('Session expired or revoked');

      const verified = this.jwtService.verify(refreshToken) as JwtPayload;
      if (verified.jti !== decoded.jti)
        throw new UnauthorizedException('Token JTI mismatch');

      // revoke old
      await this.revokeRefreshToken(decoded.jti);

      // issue new
      return this.createTokenPair(
        {
          userId: verified.userId,
          role: verified.role,
          merchantId: verified.merchantId,
        },
        sessionInfo,
      );
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async revokeRefreshToken(jti: string): Promise<void> {
    await this.store.deleteSession(jti);
    await this.store.addToBlacklist(jti, this.REFRESH_TOKEN_TTL);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const all = await this.store.getUserSessions(userId);
    for (const jti of all) {
      await this.revokeRefreshToken(jti);
    }
    await this.store.clearUserSessions(userId);
  }

  async validateAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const decoded = this.jwtService.verify(token) as JwtPayload;
      if (!decoded?.jti) return null;
      const black = await this.store.isBlacklisted(decoded.jti);
      if (black) return null;
      return decoded;
    } catch {
      return null;
    }
  }

  async validateSession(jti: string): Promise<SessionData | null> {
    const sess = await this.store.getSession(jti);
    if (!sess) return null;
    // refresh lastUsed + TTL
    sess.lastUsed = Math.floor(Date.now() / 1000);
    await this.store.setSession(jti, sess, this.REFRESH_TOKEN_TTL);
    return sess;
  }
}
