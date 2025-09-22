// src/common/guards/account-state.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class AccountStateGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const allowUnverified = this.reflector.getAllAndOverride<boolean>(
      'allowUnverifiedEmail',
      [ctx.getHandler(), ctx.getClass()],
    );

    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const u = req.authUser;

    if (!u) return false;

    if (u.active === false) {
      throw new ForbiddenException('الحساب معطّل، تواصل مع الدعم');
    }

    if (!allowUnverified && !u.emailVerified) {
      throw new ForbiddenException(
        'يجب تفعيل البريد الإلكتروني قبل استخدام هذه الميزة',
      );
    }

    return true;
  }
}
