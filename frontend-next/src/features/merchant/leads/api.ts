import axiosInstance from '@/lib/api/axios';
import type { Lead, LeadsSettings } from './types';

export async function fetchLeads(merchantId: string): Promise<Lead[]> {
  const response = await axiosInstance.get<Lead[]>(`/merchants/${merchantId}/leads`);
  return response.data || [];
}

export async function fetchLeadsSettings(merchantId: string): Promise<LeadsSettings> {
  const response = await axiosInstance.get<LeadsSettings>(`/merchants/${merchantId}/leads/settings`);
  return response.data;
}

export async function updateLeadsSettings(
  merchantId: string,
  settings: LeadsSettings
): Promise<LeadsSettings> {
  const response = await axiosInstance.put<LeadsSettings>(
    `/merchants/${merchantId}/leads/settings`,
    settings
  );
  return response.data;
}

