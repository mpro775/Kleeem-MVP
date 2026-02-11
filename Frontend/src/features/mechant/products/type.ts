// ===== Enums / Types =====
export type Currency = 'SAR' | 'YER' | 'USD';

export interface Offer {
  enabled: boolean;
  oldPrice?: number;
  newPrice?: number;
  startAt?: string; // ISO string
  endAt?: string;   // ISO string
}

export interface Badge {
  label: string;
  color?: string | null;
  showOnCard?: boolean;
  order?: number;
}

export interface ProductResponse {
  _id: string;
  id?: string;
  merchantId: string;
  platform?: string;
  quantity?: number;
  stock?: number;
  lowStockThreshold?: number | null;
  isUnlimitedStock?: boolean;
  
  name: string;
  shortDescription?: string;
  richDescription?: string;

  prices: Record<string, number>;
  priceDefault?: number;
  // deprecated fallback
  price?: number;
  currency?: Currency;

  offer?: Offer;
  hasActiveOffer?: boolean;
  priceEffective?: number;

  isAvailable: boolean;
  images: string[];
  category: string;

  specsBlock: string[];
  keywords: string[];
  attributes?: { keySlug: string; valueSlugs: string[] }[];
  badges?: Badge[];

  status?: 'draft' | 'published' | 'scheduled' | 'archived';
  source: 'manual' | 'api';
  sourceUrl?: string;

  createdAt: string;
  updatedAt: string;

  // (اختياري) لو عندك في السكيمـا
  slug?: string;
  storefrontSlug?: string;
  hasVariants?: boolean;
  variants?: VariantInput[];
}

export const ProductSource = {
  MANUAL: 'manual',
  API: 'api',
} as const;
export type ProductSource = typeof ProductSource[keyof typeof ProductSource];

// للعرض المختصر
export type ProductView = {
  id: string;
  title: string;
  price: number;
  isActive?: boolean;
};

// ===== Create/Update DTO =====
export interface AttributeDefinition {
  _id?: string;
  keySlug: string;
  label: string;
  type: "list" | "text" | "number" | "boolean";
  allowedValues?: { valueSlug: string; label: string }[];
  isVariantDimension?: boolean;
  status?: "active" | "archived";
}

export interface CreateProductDto {
  // أساسي
  name?: string;
  shortDescription?: string;
  richDescription?: string;
  prices?: Record<string, number>;
  // deprecated fallback
  price?: number;
  currency?: Currency;          // NEW
  isAvailable?: boolean;
  category?: string;

  // إضافي
  specsBlock?: string[];
  keywords?: string[];
  images?: string[];
  attributes?: { keySlug: string; valueSlugs: string[] }[];
  badges?: Badge[];
  hasVariants?: boolean;
  variants?: VariantInput[];

  // مصادر
  sourceUrl?: string;
  externalId?: string;
  platform?: string;
  source?: ProductSource;

  // عروض
  offer?: Offer; // NEW
}
export type UpdateProductDto = Partial<CreateProductDto>;

export interface VariantInput {
  sku: string;
  barcode?: string | null;
  attributes: Record<string, string>;
  prices: Record<string, number>;
  // deprecated fallback
  price?: number;
  stock: number;
  lowStockThreshold?: number | null;
  images?: string[];
  isAvailable?: boolean;
  weight?: number;
}
