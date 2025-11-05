// =========================
// File: src/features/store/api/products.ts
// =========================
import axiosInstance from "@/lib/axios";
import type { ProductResponse } from "@/features/merchant/products/types";

export async function fetchProductById(productId: string): Promise<ProductResponse> {
  const { data } = await axiosInstance.get<ProductResponse>(
    `/products/${encodeURIComponent(productId)}`
  );
  return data;
}
