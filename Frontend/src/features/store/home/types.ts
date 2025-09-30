import type { Category } from "@/features/mechant/categories/type";
  import type { ProductResponse } from "@/features/mechant/products/type";

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

// ============ Common safe types ============
export type IdLike =
  | string
  | { id?: string; _id?: string; merchantId?: string | undefined };

export interface StorefrontEnvelope {
  merchantId?: string;
  merchant?: IdLike;
  store?: { merchant?: IdLike };
  storefront?: { merchant?: IdLike };
  products?: ProductResponse[];
  categories?: Category[];
}

export interface PublicResolver {
  merchant?: IdLike;
  merchantId?: string;
}

// حارس عام للكائنات
export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

// يستخرج معرفًا من أشكال متعددة
export function pickId(x: unknown): string | null {
  if (typeof x === "string") return x;
  if (isObj(x)) {
    const obj = x as Record<string, unknown>;
    const v =
      (typeof obj.id === "string" && obj.id) ||
      (typeof obj._id === "string" && obj._id) ||
      (typeof obj.merchantId === "string" && obj.merchantId) ||
      null;
    return v ? String(v) : null;
  }
  return null;
}
