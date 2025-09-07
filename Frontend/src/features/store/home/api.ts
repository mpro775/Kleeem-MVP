// =========================
// File: src/features/store/api/store.api.ts
// =========================
import axiosInstance from "@/shared/api/axios";
import type { ProductResponse, Category } from "./types";

export async function fetchStore(slugOrId: string) {
  const res = await axiosInstance.get(`/storefront/${slugOrId}`);
  return res.data;
}

export async function fetchPublicResolver(target: string) {
  try {
    const res = await axiosInstance.get(`/public/${target}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function fetchProducts(merchantId: string, limit = 200) {
  try {
    const { data } = await axiosInstance.get<ProductResponse[]>("/products", {
      params: { merchantId, limit },
    });
    return data ?? [];
  } catch {
    return [];
  }
}
export const isObjectId = (s: string) => /^[a-f\d]{24}$/i.test(s);

export async function getProductById(id: string) {
  const { data } = await axiosInstance.get(
    `/products/${encodeURIComponent(id)}`
  );
  return data;
}

export async function getPublicProductBySlug(
  storeSlug: string,
  productSlug: string
) {
  const { data } = await axiosInstance.get(
    `/products/public/${encodeURIComponent(
      storeSlug
    )}/product/${encodeURIComponent(productSlug)}`
  );
  return data;
}
export async function fetchCategories(merchantId: string) {
  try {
    const { data } = await axiosInstance.get<Category[]>("/categories", {
      params: { merchantId },
    });
    return data ?? [];
  } catch {
    return [];
  }
}

export async function fetchOffers(merchantId: string) {
  const { data } = await axiosInstance.get("/offers", {
    params: { merchantId, limit: 100 },
  });
  return data as any[];
}
