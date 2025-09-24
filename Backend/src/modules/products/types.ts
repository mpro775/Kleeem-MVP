// src/modules/products/types.ts
import type { Product } from './schemas/product.schema';

// عدّل الحقول التي هي Map في الـ schema إلى Record في الـ Lean
export type ProductLean = Omit<Product, 'attributes'> & {
  attributes?: Record<string, string[]>;
};
