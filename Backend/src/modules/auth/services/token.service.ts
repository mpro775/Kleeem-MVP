import { randomUUID, createHash } from 'crypto';
import { randomBytes } from 'crypto';

import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

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

  private generateCsrfToken(): string {
    return randomBytes(32).toString('hex'); // 64 character hex string
  }

  private hashRefreshToken(token: string): string {
    const salt =
      this.config.get<string>('JWT_REFRESH_SALT') ||
      'default-salt-change-in-production';
    return createHash('sha256')
      .update(token + salt)
      .digest('hex');
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
    const common = {
      issuer: this.config.get('JWT_ISSUER'),
      audience: this.config.get('JWT_AUDIENCE'),
      algorithm: 'HS256' as const,
    };

    const accessToken = this.jwtService.sign(claims, {
      ...common,
      expiresIn: '15m',
    });
    return { accessToken, jti };
  }
  async createTokenPair(
    payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>,
    sessionInfo?: { userAgent?: string; ip?: string; csrfToken?: string },
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

    const common = {
      issuer: this.config.get('JWT_ISSUER'),
      audience: this.config.get('JWT_AUDIENCE'),
      algorithm: 'HS256' as const,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      ...common,
      expiresIn: this.ACCESS_TOKEN_TTL,
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      ...common,
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
      csrfToken: sessionInfo?.csrfToken || this.generateCsrfToken(),
      refreshTokenHash: this.hashRefreshToken(refreshToken),
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
      const decoded = this.jwtService.decode(refreshToken);
      if (!decoded?.jti)
        throw new UnauthorizedException('Invalid refresh token format');

      const sess = await this.store.getSession(decoded.jti);
      if (!sess) throw new UnauthorizedException('Session expired or revoked');

      // Verify refresh token hash matches stored hash
      const tokenHash = this.hashRefreshToken(refreshToken);
      if (sess.refreshTokenHash !== tokenHash) {
        // Token reuse detected - revoke the entire session family
        await this.revokeAllUserSessions(sess.userId);
        throw new UnauthorizedException('Token has been compromised');
      }

      const verified = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });
      if (verified.jti !== decoded.jti)
        throw new UnauthorizedException('Token JTI mismatch');

      // Get old session CSRF token
      const oldSession = await this.store.getSession(decoded.jti);
      const csrfToken = oldSession?.csrfToken || this.generateCsrfToken();

      // revoke old
      await this.revokeRefreshToken(decoded.jti);

      // issue new with preserved CSRF token
      const newTokens = await this.createTokenPair(
        {
          userId: verified.userId,
          role: verified.role,
          merchantId: verified.merchantId,
        },
        { ...sessionInfo, csrfToken },
      );

      // Update lastUsed in the new session
      const newDecoded = this.jwtService.decode(newTokens.refreshToken);
      if (newDecoded?.jti) {
        const newSession = await this.store.getSession(newDecoded.jti);
        if (newSession) {
          newSession.lastUsed = Math.floor(Date.now() / 1000);
          await this.store.setSession(
            newDecoded.jti,
            newSession,
            this.REFRESH_TOKEN_TTL,
          );
        }
      }

      return newTokens;
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

  async blacklistAccessJti(jti: string, ttlSeconds: number) {
    await this.store.addToBlacklist(jti, ttlSeconds);
  }

  async validateAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });
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

  async getSessionCsrfToken(jti: string): Promise<string | null> {
    const session = await this.store.getSession(jti);
    return session?.csrfToken || null;
  }
}
