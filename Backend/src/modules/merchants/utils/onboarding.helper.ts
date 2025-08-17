import { Merchant } from '../schemas/merchant.schema';

export function hasCompletedRequiredSetup(merchant: Merchant): boolean {
  return (
    !!merchant.name &&
    !!merchant.businessType &&
    !!merchant.addresses[0]?.city &&
    !!merchant.addresses[0]?.country &&
    !!merchant.subscription?.tier &&
    !!merchant.subscription?.startDate &&
    (!!merchant.channels?.whatsapp?.enabled ||
      !!merchant.channels?.telegram?.enabled ||
      !!merchant.channels?.webchat?.enabled)
  );
}

export function getOptionalEnhancementTips(merchant: Merchant): string[] {
  const tips: string[] = [];

  if (!merchant.logoUrl) {
    tips.push('أضف شعار متجرك لزيادة الثقة.');
  }

  if (!merchant.businessDescription) {
    tips.push('أضف وصفًا لنشاطك ليساعد البوت على الإجابة بدقة.');
  }

  if (
    !merchant.returnPolicy ||
    !merchant.exchangePolicy ||
    !merchant.shippingPolicy
  ) {
    tips.push('أكمل سياسات المتجر لتوفير إجابات دقيقة للعملاء.');
  }

  if ((merchant.workingHours?.length ?? 0) === 0) {
    tips.push('حدد أوقات العمل لضمان استجابات دقيقة من البوت.');
  }

  if (!merchant.quickConfig?.customInstructions?.length) {
    tips.push('أضف تعليمات مخصصة لتخصيص ردود البوت.');
  }

  return tips;
}
