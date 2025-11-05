import axiosInstance from '@/lib/axios';
import type { MissingResponse } from './type';



export async function getMissingResponses(params: {
  page?: number;
  limit?: number;
  resolved?: 'all' | 'true' | 'false';
  channel?: 'all' | 'telegram' | 'whatsapp' | 'webchat';
  type?: 'all' | 'missing_response' | 'unavailable_product';
  search?: string;
  from?: string;
  to?: string;
}) {
  const { data } = await axiosInstance.get('/analytics/missing-responses', { params });
  
  // Handle different response structures
  if (data && Array.isArray(data.items) && typeof data.total === 'number') {
    return data as { items: MissingResponse[]; total: number; page: number; limit: number };
  } else if (Array.isArray(data)) {
    // Handle case where API returns array directly
    return { items: data, total: data.length, page: 1, limit: data.length };
  } else {
    console.warn('Unexpected API response structure:', data);
    return { items: [], total: 0, page: 1, limit: 20 };
  }
}

export async function resolveMissingResponse(id: string) {
  const { data } = await axiosInstance.patch(`/analytics/missing-responses/${id}/resolve`);
  return data;
}
export async function addMissingToKnowledge(id: string, payload: { question: string; answer: string }) {
    const { data } = await axiosInstance.post(`/analytics/missing-responses/${id}/add-to-knowledge`, payload);
    return data as { success: boolean; faqId: string; missingResponseId: string; resolved: boolean };
  }
export async function bulkResolve(ids: string[]) {
  const { data } = await axiosInstance.patch(`/analytics/missing-responses/resolve`, { ids });
  return data;
}

export async function getMissingStats(days = 7) {
  const { data } = await axiosInstance.get(`/analytics/missing-responses/stats`, { params: { days } });
  return data;
}
