export interface MerchantRepository {
  /**
   * الحصول على publicSlug للتاجر (إن وُجد)
   */
  getPublicSlug(merchantId: string): Promise<string | undefined>;
}
