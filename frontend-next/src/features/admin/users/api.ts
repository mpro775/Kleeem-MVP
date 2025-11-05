import axiosInstance from '@/lib/api/axios';
import type { User } from './types';

export async function fetchUsers(): Promise<User[]> {
  const response = await axiosInstance.get<User[]>('/admin/users');
  return response.data || [];
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  const response = await axiosInstance.patch<User>(`/admin/users/${id}`, data);
  return response.data;
}

export async function deleteUser(id: string): Promise<void> {
  await axiosInstance.delete(`/admin/users/${id}`);
}

