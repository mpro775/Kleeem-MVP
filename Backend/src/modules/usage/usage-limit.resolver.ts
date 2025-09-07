// src/modules/usage/usage-limit.resolver.ts
import { Injectable } from '@nestjs/common';
import { PlansService } from 'src/modules/plans/plans.service';
import type { MerchantDocument } from 'src/modules/merchants/schemas/merchant.schema';
import { PlanTier } from 'src/modules/merchants/schemas/subscription-plan.schema';

@Injectable()
export class UsageLimitResolver {
  constructor(private readonly plansService: PlansService) {}

  // خريطة افتراضية بسيطة (يمكن وضعها في config)
  private defaultTierLimits: Record<PlanTier, number> = {
    [PlanTier.Free]: 100,
    [PlanTier.Starter]: 1000,
    [PlanTier.Business]: 5000,
    [PlanTier.Enterprise]: Number.MAX_SAFE_INTEGER, // غير محدود
  };

  private parseFeatureLimit(features: string[] | undefined) {
    // صيغة ميزة: "messageLimit:3000"
    const entry = features?.find((f) => /^messageLimit:\d+$/i.test(f));
    if (!entry) return undefined;
    const [, raw] = entry.split(':');
    return Number(raw);
  }

  async resolveForMerchant(merchant: MerchantDocument) {
    // 1) ميزة مخصّصة؟
    const override = this.parseFeatureLimit(merchant.subscription?.features);
    if (typeof override === 'number' && !Number.isNaN(override)) {
      return {
        limit: override,
        isUnlimited: override === Number.MAX_SAFE_INTEGER,
      };
    }

    // 2) خطة موصولة؟
    const planId = merchant.subscription?.planId;
    if (planId) {
      const plan = await this.plansService.findById(String(planId));
      const limit =
        typeof plan.messageLimit === 'number' && plan.messageLimit >= 0
          ? plan.messageLimit
          : Number.MAX_SAFE_INTEGER;
      return { limit, isUnlimited: limit === Number.MAX_SAFE_INTEGER };
    }

    // 3) حد افتراضي من الـ tier
    const tier = merchant.subscription?.tier ?? PlanTier.Free;
    const limit =
      this.defaultTierLimits[tier] ?? this.defaultTierLimits[PlanTier.Free];
    return { limit, isUnlimited: limit === Number.MAX_SAFE_INTEGER };
  }
}
