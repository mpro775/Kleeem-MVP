import axiosInstance from '@/lib/api/axios';
import type { Template } from './types';

export async function fetchTemplates(): Promise<Template[]> {
  const response = await axiosInstance.get<Template[]>('/admin/templates');
  return response.data || [];
}

export async function createTemplate(data: Partial<Template>): Promise<Template> {
  const response = await axiosInstance.post<Template>('/admin/templates', data);
  return response.data;
}

export async function updateTemplate(id: string, data: Partial<Template>): Promise<Template> {
  const response = await axiosInstance.patch<Template>(`/admin/templates/${id}`, data);
  return response.data;
}

export async function deleteTemplate(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/templates/${id}`);
}

