// src/features/mechant/merchant-settings/api.ts
import type { MerchantInfo } from "./types";
import axios from "@/shared/api/axios";

// ✅ 1) جلب بيانات التاجر
export const getMerchantInfo = async (
  merchantId: string
): Promise<MerchantInfo> => {
  const res = await axios.get<MerchantInfo>(`/merchants/${merchantId}`);
  return res.data; // interceptor عندنا يطبع مباشرة
};

// ✅ 2) تحديث بيانات التاجر
export const updateMerchantInfo = async (
  merchantId: string,
  info: Partial<MerchantInfo>
): Promise<void> => {
  // مسموح فقط بالمفاتيح التالية
  const KEYS = [
    "name",
    "logoUrl",
    "phone",
    "businessDescription",
    "addresses",
    "workingHours",

    "returnPolicy",
    "exchangePolicy",
    "shippingPolicy",
    "socialLinks",
    "publicSlug",
    "publicSlugEnabled",
  ] as const;

  const body: Record<string, unknown> = {};
  for (const k of KEYS) {
    const v = (info as any)[k];
    if (v !== undefined) body[k] = v;
  }

  console.log("updateMerchantInfo OUTGOING body =", body);
  await axios.put(`/merchants/${merchantId}`, body);
};

// ✅ 3) رفع شعار التاجر
export async function uploadMerchantLogo(
  merchantId: string,
  file: File
): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await axios.post(`/merchants/${merchantId}/logo`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // يدعم الحالتين: { url } أو { success, data: { url } }
  const url =
    (res.data as any)?.url ??
    (res.data as any)?.data?.url ??
    (res as any)._raw?.url; // interceptor يحفظ الخام في _raw

  if (!url) throw new Error("لم يتم استلام رابط الشعار من الخادم");
  return { url };
}

// ✅ 4) التحقق من توفر slug
export async function checkPublicSlugAvailability(
  slug: string
): Promise<{ available: boolean }> {
  const res = await axios.get("/merchants/check-public-slug", {
    params: { slug },
  });

  // يدعم الشكلين
  const available = res?.data?.data?.available ?? res?.data?.available ?? false;

  return { available: Boolean(available) };
}

// ✅ 5) تحديث slug الخاص بالـ storefront (لو عندك كيان منفصل)
export async function updateStorefrontSlug(
  merchantId: string,
  slug: string
): Promise<{ slug: string }> {
  const res = await axios.patch(`/storefronts/by-merchant/${merchantId}`, {
    slug,
  });
  // قد يرجع { slug } أو { data: { slug } }
  const s = (res.data as any)?.slug ?? (res.data as any)?.data?.slug;
  return { slug: s };
}
