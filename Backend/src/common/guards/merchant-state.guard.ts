// src/common/guards/merchant-state.guard.ts
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class MerchantStateGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const skipMerchantCheck = this.reflector.getAllAndOverride<boolean>(
      'skipMerchantCheck',
      [ctx.getHandler(), ctx.getClass()],
    );
    if (skipMerchantCheck) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithUser>();
    const u = req.authUser;
    const m = req.authMerchant;

    if (!u) return false;

    // الإداريون عادة لا يحتاجون Merchant
    if (u.role === 'ADMIN') return true;

    // لو ما عنده Merchant، بعض المسارات قد تسمح (مثل ensure-merchant). اتركها تقيّم عبر @SkipMerchantCheck
    if (!u.merchantId) {
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    }

    if (!m) {
      throw new ForbiddenException('بيانات التاجر غير متاحة');
    }

    if (m.deletedAt || m.active === false) {
      throw new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا');
    }

    return true;
  }
}
