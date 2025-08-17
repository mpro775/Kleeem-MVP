// src/integrations/types.ts
export interface ExternalProduct {
  externalId: string;
  title: string;
  price: number | null;
  currency?: string;
  stock?: number | null;
  updatedAt?: Date | null;
  raw: unknown; // للديبق فقط
}

// لو تبغى، عرّف شكل استجابة زد (مرن):
export interface ZidProductsResponse {
  data: unknown[]; // نضبطها بأنفسنا لاحقًا
  links?: { next?: string | null };
}
