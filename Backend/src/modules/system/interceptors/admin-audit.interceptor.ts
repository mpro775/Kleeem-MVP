import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';

import { AdminAuditService } from '../services/admin-audit.service';

function getClientIp(req: Request): string | undefined {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') return xff.split(',')[0]?.trim();
  if (Array.isArray(xff)) return xff[0]?.trim();
  return req.socket?.remoteAddress;
}

@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AdminAuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { user?: { userId?: string; role?: string } }>();
    const path = req.path ?? req.url;
    if (!path.startsWith('/admin') || !req.user?.userId || req.user?.role !== 'ADMIN') {
      return next.handle();
    }

    const action = `${req.method} ${path}`;
    this.auditService
      .log({
        actorId: req.user.userId,
        action: action.slice(0, 200),
        method: req.method,
        path: path.slice(0, 500),
        ip: getClientIp(req),
        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 500) : undefined,
      })
      .catch(() => {});

    return next.handle();
  }
}
