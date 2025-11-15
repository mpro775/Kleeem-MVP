// src/features/merchant-settings/utils.ts
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";

export const filterUpdatableFields = (
  data: Partial<MerchantInfo>   // <-- خليه Partial
): Partial<MerchantInfo> => {
  const {
    name,
    logoUrl,
    phone,
    businessDescription,
    addresses,
    workingHours,
    returnPolicy,
    exchangePolicy,
    shippingPolicy,
    socialLinks,
    customCategory,
    publicSlug,           // 👈 مهم
    publicSlugEnabled,    // 👈 مهم
  } = data;

  return {
    name,
    logoUrl,
    phone,
    businessDescription,
    addresses,
    workingHours,
    returnPolicy,
    exchangePolicy,
    shippingPolicy,
    socialLinks,
    customCategory,
    publicSlug,           // 👈 مهم
    publicSlugEnabled,    // 👈 مهم
  };
};
