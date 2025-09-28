// src/features/widget-config/api.ts
import axiosInstanceInstance from "@/shared/api/axiosInstance";
import type { ChatWidgetSettings } from "./types";
import { API_BASE } from "@/context/config";

export async function fetchWidgetSettings(merchantId: string): Promise<ChatWidgetSettings> {
  const { data } = await axiosInstance.get<ChatWidgetSettings>(`${API_BASE}/merchants/${merchantId}/widget-settings`);
  return data;
}

export async function saveWidgetSettings(merchantId: string, dto: ChatWidgetSettings): Promise<void> {
  await axiosInstance.put(`/merchants/${merchantId}/widget-settings`, dto);
}

export async function generateSlug(merchantId: string): Promise<string> {
  const { data } = await axiosInstance.post<{ widgetSlug: string }>(`/merchants/${merchantId}/widget-settings/slug`);
  return data.widgetSlug;
}
