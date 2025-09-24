// src/vector/types.ts
export interface EmbeddableProduct {
  id: string;
  merchantId: string;
  name?: string;
  description?: string;

  category?: string | string[];
  categoryName?: string | null;
  categoryId?: string | null;

  specsBlock?: unknown[];
  keywords?: unknown[];
  attributes?: Record<string, unknown>;

  images?: unknown[];
  slug?: string | null;
  storefrontSlug?: string | null;
  domain?: string | null;
  publicUrlStored?: string | null;

  price?: number | null;
  priceEffective?: number | null;
  currency?: string | null;
  hasActiveOffer?: boolean;
  priceOld?: number | null;
  priceNew?: number | null;
  offerStart?: string | Date | null;
  offerEnd?: string | Date | null;
  discountPct?: number | null;

  isAvailable?: boolean | null;
  status?: string | null;
  quantity?: number | null;
}

export type FAQData = {
  question?: string;
  answer?: string;
  [key: string]: unknown;
};
export type DocumentData = {
  text?: string;
  documentId?: string;
  [key: string]: unknown;
};
export type WebData = { text?: string; url?: string; [key: string]: unknown };
export interface SearchResult {
  type: 'faq' | 'document' | 'web';
  score: number;
  data: FAQData | DocumentData | WebData;
  id: string | number;
}
export interface EmbeddableOffer {
  id: string;
  name: string;
  description: string;
  type: string;
  code?: string;
  // أي حقول أخرى مهمة لتوصيف العرض
}
export interface BotFaqSearchItem {
  id: string | number;
  question: string;
  answer: string;
  score: number;
}
