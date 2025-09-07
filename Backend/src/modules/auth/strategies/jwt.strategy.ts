// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';

type Role = 'ADMIN' | 'MERCHANT' | 'MEMBER';
export interface JwtPayload {
  userId: string;
  role: Role;
  merchantId?: string | null;
  iat?: number;
}

function cookieExtractor(req: Request): string | null {
  return (
    (req.cookies && (req.cookies['access_token'] || req.cookies['token'])) ||
    null
  );
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
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return {
      userId: payload.userId,
      role: payload.role,
      merchantId: payload.merchantId ?? null,
      iat: payload.iat,
    };
  }
}
