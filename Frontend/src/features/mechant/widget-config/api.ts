// src/features/widget-config/api.ts
import axiosInstance from "@/shared/api/axios";
import type { ChatWidgetSettings } from "./types";

export async function fetchWidgetSettings(merchantId: string): Promise<ChatWidgetSettings> {
  // في demo mode، استخدم relative URL
  const url = merchantId ? `/merchants/${merchantId}/widget-settings` : "";
  const { data } = await axiosInstance.get<ChatWidgetSettings>(url);
  return data;
}

export async function saveWidgetSettings(merchantId: string, dto: ChatWidgetSettings): Promise<void> {
  await axiosInstance.put(`/merchants/${merchantId}/widget-settings`, dto);
}

export async function generateSlug(merchantId: string): Promise<string> {
  const { data } = await axiosInstance.post<{ widgetSlug: string }>(`/merchants/${merchantId}/widget-settings/slug`);
  return data.widgetSlug;
}
