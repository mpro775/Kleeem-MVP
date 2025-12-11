// src/modules/products/types.ts
import type { Product } from './schemas/product.schema';

// عدّل الحقول المركبة إلى أنواع أبسط في الـ Lean
export type ProductLean = Omit<Product, 'attributes'> & {
  attributes?: { keySlug: string; valueSlugs: string[] }[];
};
