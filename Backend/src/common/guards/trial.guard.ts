// src/common/guards/trial.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';

import { MerchantDocument } from '../../modules/merchants/schemas/merchant.schema';
import { PlanTier } from '../../modules/merchants/schemas/subscription-plan.schema';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class TrialGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    if (!request) {
      // If no request object, allow access (edge case)
      return true;
    }

    const merchant = request.user?.merchantId as unknown as MerchantDocument;

    // If no merchant context, allow access (maybe for public endpoints)
    if (!merchant) {
      return true;
    }

    // If no subscription info, allow access
    if (!merchant.subscription) {
      return true;
    }

    // الباقة المجانية لا تنتهي أبداً
    if (merchant.subscription.tier === PlanTier.Free) {
      return true;
    }

    const end = merchant.subscription.endDate;

    // إذا لم يُحدد تاريخ انتهاء، نعطي صلاحية دائمة
    if (!end) {
      return true;
    }

    // إذا كان التاريخ غير صالح، نعتبره منتهياً
    const endTime = end.getTime();
    if (isNaN(endTime)) {
      throw new ForbiddenException('Your subscription has expired');
    }

    // إذا انتهى الاشتراك، نمنع الوصول
    if (Date.now() >= endTime) {
      throw new ForbiddenException('Your subscription has expired');
    }

    return true;
  }
}
