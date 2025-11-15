// src/api/instructions.ts
import axiosInstance from '@/shared/api/axios';
import type { Instruction } from './type';


export async function listInstructions(params: {
  active?: 'all' | 'true' | 'false';
  page?: number;
  limit?: number;
}) {
  const p: { page: number; limit: number; active?: 'true' | 'false' } = { page: params.page ?? 1, limit: params.limit ?? 20 };
  if (params.active && params.active !== 'all') p.active = params.active;
  const { data } = await axiosInstance.get('/instructions', { params: p });
  
  // Handle different response structures
  if (Array.isArray(data)) {
    return data as Instruction[];
  } else if (data && Array.isArray(data.items)) {
    return data.items as Instruction[];
  } else if (data && Array.isArray(data.data)) {
    return data.data as Instruction[];
  } else {
    console.warn('Unexpected API response structure:', data);
    return [] as Instruction[];
  }
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
