// src/modules/usage/usage-limit.resolver.ts
import { Injectable } from '@nestjs/common';
import { PlanTier } from 'src/modules/merchants/schemas/subscription-plan.schema';
import { PlansService } from 'src/modules/plans/plans.service';

import type { MerchantDocument } from 'src/modules/merchants/schemas/merchant.schema';

// ثوابت لتجنب الأرقام السحرية
const DEFAULT_FREE_LIMIT = 100;
const DEFAULT_STARTER_LIMIT = 1000;
const DEFAULT_BUSINESS_LIMIT = 5000;
const UNLIMITED_MESSAGES = Number.MAX_SAFE_INTEGER;

@Injectable()
export class UsageLimitResolver {
  constructor(private readonly plansService: PlansService) {}

  // خريطة افتراضية بسيطة (يمكن وضعها في config)
  private defaultTierLimits: Record<PlanTier, number> = {
    [PlanTier.Free]: DEFAULT_FREE_LIMIT,
    [PlanTier.Starter]: DEFAULT_STARTER_LIMIT,
    [PlanTier.Business]: DEFAULT_BUSINESS_LIMIT,
    [PlanTier.Enterprise]: UNLIMITED_MESSAGES, // غير محدود
  };

  private parseFeatureLimit(features: string[] | undefined) {
    // صيغة ميزة: "messageLimit:3000"
    const entry = features?.find((f) => /^messageLimit:\d+$/i.test(f));
    if (!entry) return undefined;
    const [, raw] = entry.split(':');
    return Number(raw);
  }

  async resolveForMerchant(
    merchant: MerchantDocument,
  ): Promise<{ limit: number; isUnlimited: boolean }> {
    // 1) ميزة مخصّصة؟
    const override = this.parseFeatureLimit(merchant.subscription?.features);
    if (typeof override === 'number' && !Number.isNaN(override)) {
      return {
        limit: override,
        isUnlimited: override === UNLIMITED_MESSAGES,
      };
    }

    // 2) خطة موصولة؟
    const planId = merchant.subscription?.planId;
    if (planId) {
      const plan = await this.plansService.findById(String(planId));
      const limit =
        typeof plan.messageLimit === 'number' && plan.messageLimit >= 0
          ? plan.messageLimit
          : UNLIMITED_MESSAGES;
      return { limit, isUnlimited: limit === UNLIMITED_MESSAGES };
    }

    // 3) حد افتراضي من الـ tier
    const tier = merchant.subscription?.tier ?? PlanTier.Free;
    const limit =
      this.defaultTierLimits[tier] ?? this.defaultTierLimits[PlanTier.Free];
    return { limit, isUnlimited: limit === UNLIMITED_MESSAGES };
  }
}
