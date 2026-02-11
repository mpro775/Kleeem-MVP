// src/features/mechant/merchant-settings/api.ts
import type { MerchantInfo } from "./types";
import axiosInstance from "@/shared/api/axios";

// ✅ 1) جلب بيانات التاجر
export const getMerchantInfo = async (
  merchantId: string
): Promise<MerchantInfo> => {
  const res = await axiosInstance.get<MerchantInfo>(`/merchants/${merchantId}`);
  return res.data; // axiosInstance يطبّع الاستجابة ويعيد data مباشرة
};

// ✅ 2) تحديث بيانات التاجر
export const updateMerchantInfo = async (
  merchantId: string,
  info: Partial<MerchantInfo>
): Promise<void> => {
  // مسموح فقط بالمفاتيح التالية (متوافق مع UpdateMerchantDto في الباك إند)
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
    "customCategory",
  ] as const;

  const body: Record<string, unknown> = {};
  for (const k of KEYS) {
    const v = (info as any)[k];
    if (v !== undefined) body[k] = v;
  }

  console.log("updateMerchantInfo OUTGOING body =", body);
  await axiosInstance.put(`/merchants/${merchantId}`, body);
};

// ✅ 3) رفع شعار التاجر
export async function uploadMerchantLogo(
  merchantId: string,
  file: File
): Promise<{ url: string }> {
  const fd = new FormData();
  fd.append("file", file);

  const res = await axiosInstance.post(`/merchants/${merchantId}/logo`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  // الباك إند يرسل الآن: { success, data: { url }, requestId, timestamp }
  const url = (res.data as any)?.url;

  if (!url) throw new Error("لم يتم استلام رابط الشعار من الخادم");
  return { url };
}

// ✅ 4) التحقق من توفر slug
export async function checkPublicSlugAvailability(
  slug: string
): Promise<{ available: boolean }> {
  const res = await axiosInstance.get("/merchants/check-public-slug", {
    params: { slug },
  });

  // الباك إند يرسل الآن: { success, data: { available }, requestId, timestamp }
  const available = res?.data?.available ?? false;

  return { available: Boolean(available) };
}

// ✅ 5) تحديث slug الخاص بالـ storefront (الباك إند: Controller('storefront'))
export async function updateStorefrontSlug(
  merchantId: string,
  slug: string
): Promise<{ slug: string }> {
  const res = await axiosInstance.patch(`/storefront/by-merchant/${merchantId}`, {
    slug,
  });
  // الباك إند يرسل الآن: { success, data: { slug }, requestId, timestamp }
  const s = (res.data as any)?.slug;
  return { slug: s };
}
