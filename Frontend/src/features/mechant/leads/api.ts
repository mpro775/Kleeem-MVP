// src/features/leads/api.ts
import axiosInstance from "@/shared/api/axios";
import type { Lead, LeadsSettings } from "./types";

export async function fetchLeadsSettings(merchantId: string): Promise<LeadsSettings> {
  const { data } = await axiosInstance.get(`/merchants/${merchantId}/leads-settings`);
  return {
    enabled: Boolean(data?.enabled ?? true),
    fields: Array.isArray(data?.fields) ? data.fields : [],
  };
}

export async function saveLeadsSettings(merchantId: string, payload: LeadsSettings): Promise<void> {
  await axiosInstance.patch(`/merchants/${merchantId}/leads-settings`, {
    enabled: payload.enabled,
    fields: payload.fields,
  });
}

export async function fetchLeads(merchantId: string): Promise<Lead[]> {
  const { data } = await axiosInstance.get(`/merchants/${merchantId}/leads`);
  return Array.isArray(data) ? data : [];
}
