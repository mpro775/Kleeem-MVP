// src/features/mechant/storefront-theme/api.ts (أو api/storefrontApi.ts حسب مسارك)
import axiosInstance from "@/lib/axios";
import type { Storefront } from "@/features/merchant/storefront-theme/type";

export async function getStorefrontInfo(merchantId?: string, slug?: string) {
  if (merchantId && merchantId.trim()) {
    const res = await axiosInstance.get<Storefront>(
      `/storefront/merchant/${merchantId}`
    );
    return res.data; // ✅ حمولة مباشرة
  }
  if (slug && slug.trim()) {
    const res = await axiosInstance.get<Storefront>(`/storefront/${slug}`);
    return res.data; // ✅ حمولة مباشرة
  }
  throw new Error("merchantId or slug is required");
}

export async function updateStorefrontInfo(
  merchantId: string,
  payload: Partial<Storefront>
): Promise<Storefront> {
  const res = await axiosInstance.patch<Storefront>(
    `/storefront/by-merchant/${merchantId}`,
    payload
  );
  return res.data; // ✅ لا تكتب .data.data
}

export async function uploadBannerImages(
  merchantId: string,
  files: File[]
): Promise<{
  urls: string[];
  accepted: number;
  remaining: number;
  max: number;
}> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));

  const res = await axiosInstance.post<{
    urls: string[];
    accepted: number;
    remaining: number;
    max: number;
  }>(`/storefront/by-merchant/${merchantId}/banners/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data; // ✅ لا .data.data
}

export async function checkSlug(slug: string): Promise<{ available: boolean }> {
  const res = await axiosInstance.get<{ available: boolean }>(
    `/storefront/slug/check`,
    { params: { slug } }
  );
  return res.data; // ✅ لا .data.data
}
export async function getPublicStorefrontBundle(slug: string) {
  const res = await axiosInstance.get(`/public/${slug}/bundle`);
  return res.data; // الباك إند يرسل: { success, data, requestId, timestamp }
}