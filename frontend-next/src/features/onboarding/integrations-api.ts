import axiosInstance from '@/lib/axios';
import type { IntegrationsStatus, SyncResult } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function getIntegrationsStatus(token: string) {
  const { data } = await axiosInstance.get<IntegrationsStatus>(
    `${API_BASE}/integrations/status`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
}

export async function syncCatalog(merchantId: string, token: string) {
  const { data } = await axiosInstance.post<SyncResult>(
    `${API_BASE}/catalog/${merchantId}/sync`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

