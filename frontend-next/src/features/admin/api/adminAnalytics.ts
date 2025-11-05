// src/api/adminAnalytics.ts
import axios from 'axios';
const BASE = `${import.meta.env.VITE_API_BASE}/admin/analytics/kleem-missing-responses`;

export type KleemItem = {
  _id: string;
  channel: 'telegram'|'whatsapp'|'webchat';
  question: string;
  botReply?: string;
  sessionId?: string;
  customerId?: string;
  aiAnalysis?: string;
  manualReply?: string;
  category?: string;
  resolved: boolean;
  createdAt: string;
};

export async function fetchKleemList(params: {
  page?: number; limit?: number; q?: string;
  channel?: 'telegram'|'whatsapp'|'webchat';
  resolved?: 'true'|'false';
  from?: string; to?: string; sessionId?: string; customerId?: string;
}) {
  const { data } = await axios.get(BASE, { params });
  return data as { items: KleemItem[]; total: number; page: number; limit: number };
}

export async function updateKleem(id: string, body: Partial<Pick<KleemItem,'resolved'|'manualReply'|'category'>>) {
  const { data } = await axios.patch(`${BASE}/${id}`, body);
  return data as KleemItem;
}

export async function bulkResolve(ids: string[]) {
  const { data } = await axios.post(`${BASE}/bulk-resolve`, { ids });
  return data as { updated: number };
}
