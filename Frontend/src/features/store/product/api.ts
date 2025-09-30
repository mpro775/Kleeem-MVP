// =========================
// File: src/features/store/api/products.ts
// =========================
import axiosInstance from "@/shared/api/axios";
import type { ProductResponse } from "@/features/mechant/products/type";

export async function fetchProductById(productId: string): Promise<ProductResponse> {
  const { data } = await axiosInstance.get<ProductResponse>(
    `/products/${encodeURIComponent(productId)}`
  );
  return data;
}
