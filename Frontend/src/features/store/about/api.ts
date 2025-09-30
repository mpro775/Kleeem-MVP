import axiosInstance from "@/shared/api/axios";

const unwrap = (x: unknown) => (x as { data?: { data?: unknown } })?.data?.data ?? (x as { data?: unknown })?.data ?? x;

/** إحضار بيانات الواجهة الأمامية للمتجر عبر slug أو id */
export async function fetchStorefront(slugOrId: string) {
  const res = await axiosInstance.get(`/storefront/${slugOrId}`);
  return unwrap(res);
}

/** إحضار معلومات التلوين/البراند للمتجر */
export async function fetchStorefrontInfo(merchantId: string) {
  const res = await axiosInstance.get(`/storefront/info/${merchantId}`);
  return unwrap(res);
}
