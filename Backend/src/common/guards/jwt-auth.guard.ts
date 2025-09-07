// src/common/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

const PUBLIC_PATHS = [
  '/metrics',
  '/health',
  '/api/health',
  '/uploads',
  '/api/docs',
  '/api/docs-json'
];

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
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

    // 3) باقي المسارات تتطلّب JWT
    return super.canActivate(context);
  }
}
