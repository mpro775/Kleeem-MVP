// src/common/guards/trial.guard.ts

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { MerchantDocument } from 'src/modules/merchants/schemas/merchant.schema';
import { PlanTier } from 'src/modules/merchants/schemas/subscription-plan.schema';

@Injectable()
export class TrialGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest();
    const merchant = request.user.merchant as MerchantDocument;

    // الباقة المجانية لا تنتهي أبداً
    if (merchant.subscription.tier === PlanTier.Free) {
      return true;
    }

    const end = merchant.subscription.endDate;
    // إذا لم يُحدد تاريخ انتهاء، نعطي صلاحية دائمة
    if (!end) {
      return true;
    }

    // إذا انتهى الاشتراك، نمنع الوصول
    if (Date.now() > end.getTime()) {
      throw new ForbiddenException('Your subscription has expired');
    }

    return true;
  }
}
