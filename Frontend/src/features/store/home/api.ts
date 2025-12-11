import axiosInstance from "@/shared/api/axios";
import type {
  ProductResponse,
  Category,
  OfferItem,
  StorefrontEnvelope,
  PublicResolver,
} from "./types";

export async function fetchStore(slugOrId: string): Promise<StorefrontEnvelope> {
  const { data } = await axiosInstance.get<StorefrontEnvelope>(`/storefront/${encodeURIComponent(slugOrId)}`);
  return data;
}

export async function fetchPublicResolver(target: string): Promise<PublicResolver | null> {
  try {
    const { data } = await axiosInstance.get<PublicResolver>(`/public/${encodeURIComponent(target)}`);
    return data;
  } catch {
    return null;
  }
}

export async function fetchProducts(merchantId: string, limit = 200): Promise<ProductResponse[]> {
  try {
    const { data } = await axiosInstance.get<ProductResponse[]>("/products", {
      params: { merchantId, limit },
    });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const isObjectId = (s: string) => /^[a-f\d]{24}$/i.test(s);

export async function getProductById(id: string): Promise<ProductResponse> {
  const { data } = await axiosInstance.get<ProductResponse>(`/products/${encodeURIComponent(id)}`);
  return data;
}

export async function getPublicProductBySlug(storeSlug: string, productSlug: string): Promise<ProductResponse> {
  const { data } = await axiosInstance.get<ProductResponse>(
    `/products/public/${encodeURIComponent(storeSlug)}/product/${encodeURIComponent(productSlug)}`
  );
  return data;
}

export async function getRelatedProducts(id: string): Promise<ProductResponse[]> {
  try {
    const { data } = await axiosInstance.get<ProductResponse[]>(
      `/products/${encodeURIComponent(id)}/related`
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchCategories(merchantId: string): Promise<Category[]> {
  try {
    const { data } = await axiosInstance.get<Category[]>("/categories", { params: { merchantId } });
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchOffers(merchantId: string): Promise<OfferItem[]> {
  const { data } = await axiosInstance.get<OfferItem[]>("/offers", {
    params: { merchantId, limit: 100 },
  });
  return Array.isArray(data) ? data : [];
}
