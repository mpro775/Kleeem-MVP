// src/common/guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import type { JwtPayload } from '../interfaces/jwt-payload.interface';
const LENTHOFBARER = 6; // Length of "Bearer"
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('رمز الوصول مطلوب');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET as string,
      });

      // إضافة المستخدم للطلب
      request['user'] = payload;
    } catch {
      throw new UnauthorizedException('رمز الوصول غير صالح');
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers?.authorization;
    if (!authHeader) return undefined;

    const lowerAuth = authHeader.toLowerCase();

    // Check if it starts with "bearer" (case insensitive)
    if (!lowerAuth.startsWith('bearer')) return undefined;

    // Check if there's whitespace after "bearer"
    if (
      authHeader.length <= LENTHOFBARER ||
      !/\s/.test(authHeader[LENTHOFBARER])
    )
      return undefined;

    // Extract token after "Bearer" + whitespace and trim any extra whitespace
    const tokenPart = authHeader.slice(LENTHOFBARER).trim(); // Skip "Bearer", then trim
    if (!tokenPart) return undefined;

    return tokenPart;
  }
}
