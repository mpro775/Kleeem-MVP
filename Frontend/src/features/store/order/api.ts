import axiosInstance from "@/shared/api/axios";
import { getSessionId } from "@/shared/utils/session";
import { getLocalCustomer } from "@/shared/utils/customer";
import type { Order } from "@/features/store/type";
import type { MerchantInfo } from "@/features/mechant/merchant-settings/types";

export async function fetchOrderById(orderId: string): Promise<Order> {
  const sessionId = getSessionId();
  const phone = getLocalCustomer()?.phone;
  const params = new URLSearchParams();
  if (sessionId) params.set("sessionId", sessionId);
  if (phone) params.set("phone", phone);
  const qs = params.toString();
  const url = `/orders/${encodeURIComponent(orderId)}${qs ? `?${qs}` : ""}`;
  const { data } = await axiosInstance.get<Order>(url);
  return data;
}

export async function fetchMerchantById(merchantId: string): Promise<MerchantInfo> {
  const { data } = await axiosInstance.get<MerchantInfo>(`/merchants/${encodeURIComponent(merchantId)}`);
  return data;
}
