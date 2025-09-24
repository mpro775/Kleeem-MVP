// src/modules/products/utils/products.cache-keys.ts
export const ProductsCacheKeys = {
  list: (merchantId: string, dtoKey: string): string =>
    `v1:products:list:${merchantId}:${dtoKey}`,
  popular: (merchantId: string): string =>
    `v1:products:popular:${merchantId}:*`,
};
