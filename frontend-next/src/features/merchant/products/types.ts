// ===== Enums / Types =====
export type Currency = 'SAR' | 'YER' | 'USD';

export interface Offer {
  enabled: boolean;
  oldPrice?: number;
  newPrice?: number;
  startAt?: string; // ISO string
  endAt?: string; // ISO string
}

export interface ProductResponse {
  _id: string;
  id?: string;
  merchantId: string;
  originalUrl?: string;
  platform?: string;
  quantity?: number;
  lowQuantity?: number;

  name: string;
  description?: string;

  price: number;
  currency?: Currency;

  offer?: Offer;
  hasActiveOffer?: boolean;
  priceEffective?: number;

  isAvailable: boolean;
  images: string[];
  category: string;

  specsBlock: string[];
  keywords: string[];
  attributes?: Record<string, string[]>;

  status?: 'active' | 'inactive' | 'out_of_stock';
  source: 'manual' | 'api' | 'scraper';
  sourceUrl?: string;

  createdAt: string;
  updatedAt: string;

  // (اختياري) لو عندك في السكيمـا
  slug?: string;
  storefrontSlug?: string;
}

export const ProductSource = {
  MANUAL: 'manual',
  API: 'api',
  SCRAPER: 'scraper',
} as const;
export type ProductSource =
  (typeof ProductSource)[keyof typeof ProductSource];

// للعرض المختصر
export type ProductView = {
  id: string;
  title: string;
  price: number;
  isActive?: boolean;
};

// ===== Create/Update DTO =====
export interface CreateProductDto {
  // أساسي
  name?: string;
  description?: string;
  price?: number;
  currency?: Currency; // NEW
  isAvailable?: boolean;
  category?: string;

  // إضافي
  specsBlock?: string[];
  keywords?: string[];
  images?: string[];
  attributes?: Record<string, string[]>; // NEW

  // مصادر
  originalUrl?: string;
  sourceUrl?: string;
  externalId?: string;
  platform?: string;
  source?: ProductSource;

  // عروض
  offer?: Offer; // NEW
}
export type UpdateProductDto = Partial<CreateProductDto>;

