export type OfferItem = {
  id: string; // product id
  name: string;
  slug?: string;
  priceOld?: number | null;
  priceNew?: number | null;
  priceEffective?: number | null;
  currency?: string;
  discountPct?: number | null;
  url?: string;
  isActive: boolean;
  period?: { startAt?: string | null; endAt?: string | null };
  image?: string;
};

export type FilterState = {
  search: string;
  activeCategory: string | null;
  showOffersOnly: boolean;
  mobileFiltersOpen: boolean;
};
export type { ProductResponse } from "@/features/mechant/products/type";
export type { Category } from "@/features/mechant/categories/type";
export type { Storefront } from "@/features/mechant/storefront-theme/type";
export type { MerchantInfo } from "@/features/mechant/merchant-settings/types";
export type { CustomerInfo } from "@/features/store/type";

