// src/features/leads/api.ts
import axiosInstance from "@/shared/api/axios";
import type { Lead, LeadsSettings } from "./types";

export async function fetchLeadsSettings(merchantId: string): Promise<LeadsSettings> {
  const { data } = await axiosInstance.get(`/merchants/${merchantId}`);
  return {
    enabled: Boolean(data?.leadsEnabled ?? true),
    fields: Array.isArray(data?.leadsSettings) ? data.leadsSettings : [],
  };
}

export async function saveLeadsSettings(merchantId: string, payload: LeadsSettings): Promise<void> {
  await axiosInstance.patch(`/merchants/${merchantId}/leads-settings`, {
    settings: payload.fields,
    enabled: payload.enabled,
  });
}

export async function fetchLeads(merchantId: string): Promise<Lead[]> {
  const { data } = await axiosInstance.get(`/merchants/${merchantId}/leads`);
  return Array.isArray(data) ? data : [];
}
