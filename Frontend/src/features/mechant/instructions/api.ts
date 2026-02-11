// src/api/instructions.ts
import axiosInstance from '@/shared/api/axios';
import type { Instruction } from './type';


export type ListInstructionsResponse = {
  items: Instruction[];
  total: number;
};

export async function listInstructions(params: {
  active?: 'all' | 'true' | 'false';
  page?: number;
  limit?: number;
}): Promise<ListInstructionsResponse> {
  const p: { page: number; limit: number; active?: 'true' | 'false' } = { page: params.page ?? 1, limit: params.limit ?? 20 };
  if (params.active && params.active !== 'all') p.active = params.active;
  const { data } = await axiosInstance.get<{ items?: Instruction[]; total?: number } | Instruction[]>('/instructions', { params: p });

  // Backend returns { items, total }
  if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
    return { items: data.items as Instruction[], total: typeof data.total === 'number' ? data.total : data.items.length };
  }
  // Legacy: plain array
  if (Array.isArray(data)) {
    return { items: data as Instruction[], total: data.length };
  }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    const arr = (data as { data: Instruction[] }).data;
    return { items: arr, total: arr.length };
  }
  return { items: [], total: 0 };
}

export async function createInstruction(payload: { instruction: string; type?: 'auto'|'manual' }) {
  const { data } = await axiosInstance.post('/instructions', payload);
  return data as Instruction;
}

export async function updateInstruction(id: string, payload: Partial<Instruction>) {
  const { data } = await axiosInstance.patch(`/instructions/${id}`, payload);
  return data as Instruction;
}

export async function removeInstruction(id: string) {
  const { data } = await axiosInstance.delete(`/instructions/${id}`);
  return data;
}

export async function toggleActive(id: string, active: boolean) {
  const url = active ? `/instructions/${id}/activate` : `/instructions/${id}/deactivate`;
  const { data } = await axiosInstance.patch(url);
  return data;
}

export async function getSuggestions(limit = 10) {
  const { data } = await axiosInstance.get('/instructions/suggestions', { params: { limit } });
  return data as { items: { badReply: string; count: number; instruction: string }[] };
}

export async function generateFromBadReplies(badReplies: string[]) {
  const { data } = await axiosInstance.post('/instructions/auto/generate', { badReplies });
  return data as { results: { badReply: string; instruction: string }[] };
}
