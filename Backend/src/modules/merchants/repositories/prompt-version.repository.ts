import { MerchantDocument } from '../schemas/merchant.schema';

export interface PromptVersionRepository {
  /** يجلب التاجر للاستخدام الداخلي أو يرمي NotFoundException */
  getOrFail(merchantId: string): Promise<MerchantDocument>;

  /** يجلب history فقط بشكل خفيف */
  getAdvancedHistory(
    merchantId: string,
  ): Promise<{ template: string; note?: string; updatedAt: Date }[]>;

  /** يضيف عنصرًا إلى history ثم يحفظ */
  appendAdvancedHistory(
    merchantId: string,
    entry: { template: string; note?: string; updatedAt: Date },
  ): Promise<void>;

  /** يحدّث currentAdvancedConfig */
  setCurrentAdvancedConfig(
    merchantId: string,
    data: { template: string; updatedAt: Date; note?: string },
  ): Promise<void>;
}
