import axiosInstance from "@/shared/api/axios";

const unwrap = (x: any) => x?.data?.data ?? x?.data ?? x;

export async function fetchOrderById(orderId: string) {
  const res = await axiosInstance.get(`/orders/${orderId}`);
  return unwrap(res);
}

export async function fetchMerchantById(merchantId: string) {
  const res = await axiosInstance.get(`/merchants/${merchantId}`);
  return unwrap(res);
}
