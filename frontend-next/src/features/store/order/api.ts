
import axiosInstance from "@/lib/axios";
import type { Order } from "@/features/store/type";
import type { MerchantInfo } from "@/features/merchant/merchant-settings/types";

export async function fetchOrderById(orderId: string): Promise<Order> {
  const { data } = await axiosInstance.get<Order>(`/orders/${encodeURIComponent(orderId)}`);
  return data;
}

export async function fetchMerchantById(merchantId: string): Promise<MerchantInfo> {
  const { data } = await axiosInstance.get<MerchantInfo>(`/merchants/${encodeURIComponent(merchantId)}`);
  return data;
}
