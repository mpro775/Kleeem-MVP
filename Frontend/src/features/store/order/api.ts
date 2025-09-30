
import axiosInstance from "@/shared/api/axios";
import type { Order } from "@/features/store/type";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";

export async function fetchOrderById(orderId: string): Promise<Order> {
  const { data } = await axiosInstance.get<Order>(`/orders/${encodeURIComponent(orderId)}`);
  return data;
}

export async function fetchMerchantById(merchantId: string): Promise<MerchantInfo> {
  const { data } = await axiosInstance.get<MerchantInfo>(`/merchants/${encodeURIComponent(merchantId)}`);
  return data;
}
