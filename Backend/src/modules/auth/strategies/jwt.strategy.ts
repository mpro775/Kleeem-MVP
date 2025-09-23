// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { JwtPayload } from '../services/token.service';
import type { Request } from 'express';

const COOKIE_KEYS = ['accessToken', 'access_token', 'token'] as const;
type CookieKey = (typeof COOKIE_KEYS)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getStringCookie(cookies: unknown, key: CookieKey): string | null {
  if (!isRecord(cookies)) return null;
  const val = cookies[key];
  return typeof val === 'string' && val.length > 0 ? val : null;
}
function cookieExtractor(req: Request): string | null {
  // قد تكون req.cookies غير معرّفة أو ذات نوع غير نصّي
  const cookies: unknown = (req as { cookies?: unknown }).cookies ?? null;

  for (const key of COOKIE_KEYS) {
    const value = getStringCookie(cookies, key);
    if (value !== null) return value;
  }
  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    const secret = config.get<string>('JWT_SECRET');
    if (!secret) throw new Error('JWT_SECRET is not defined');

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor, // احذف هذا السطر إذا لا تستخدم كوكيز
      ]),
      secretOrKey: secret,
      ignoreExpiration: false,
      algorithms: ['HS256'], // طابق خوارزمية الإصدار
      issuer: config.get<string>('JWT_ISSUER') || undefined, // اختياري
      audience: config.get<string>('JWT_AUDIENCE') || undefined, // اختياري
      // ⚠️ لا يوجد clockTolerance في StrategyOptions
    });
  }

  // يُحقن الناتج في req.user
  validate(payload: JwtPayload): {
    userId: string;
    role: string;
    merchantId: string | null;
    iat?: number;
  } {
    const userId = payload.userId ?? payload.sub; // 👈 دعم الحالتين
    return {
      userId,
      role: payload.role,
      merchantId: payload.merchantId ?? null,
      iat: payload.iat,
    };
  }
}
