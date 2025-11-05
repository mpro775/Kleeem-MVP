import axiosInstance from "@/lib/axios";
import type { ChatWidgetSettings } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function fetchWidgetSettings(merchantId: string): Promise<ChatWidgetSettings> {
  const { data } = await axiosInstance.get<ChatWidgetSettings>(`${API_BASE}/merchants/${merchantId}/widget-settings`);
  return data;
}

export async function saveWidgetSettings(merchantId: string, dto: ChatWidgetSettings): Promise<void> {
  await axiosInstance.put(`${API_BASE}/merchants/${merchantId}/widget-settings`, dto);
}

export async function generateSlug(merchantId: string): Promise<string> {
  const { data } = await axiosInstance.post<{ widgetSlug: string }>(`${API_BASE}/merchants/${merchantId}/widget-settings/slug`);
  return data.widgetSlug;
}
