import axiosInstance from '@/lib/api/axios';
import type { Prompt, CreatePromptDto } from './types';

export async function fetchPrompts(): Promise<Prompt[]> {
  const response = await axiosInstance.get<Prompt[]>('/admin/prompts');
  return response.data || [];
}

export async function createPrompt(data: CreatePromptDto): Promise<Prompt> {
  const response = await axiosInstance.post<Prompt>('/admin/prompts', data);
  return response.data;
}

export async function updatePrompt(id: string, data: Partial<Prompt>): Promise<Prompt> {
  const response = await axiosInstance.patch<Prompt>(`/admin/prompts/${id}`, data);
  return response.data;
}

export async function deletePrompt(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/prompts/${id}`);
}

