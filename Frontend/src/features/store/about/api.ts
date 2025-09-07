import axiosInstance from "@/shared/api/axios";

const unwrap = (x: any) => x?.data?.data ?? x?.data ?? x;

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
