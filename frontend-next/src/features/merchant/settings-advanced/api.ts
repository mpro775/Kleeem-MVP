import axiosInstance from '@/lib/axios';
import type { UserProfile, UpdateProfilePayload, NotificationsPrefs, ChangePasswordPayload, ProductSource, ConfirmPasswordPayload } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function getMyProfile(userId: string) {
  const response = await axiosInstance.get<UserProfile>(`${API_BASE}/users/${userId}`);
  return response.data;
}

export async function updateMyProfile(userId: string, payload: UpdateProfilePayload) {
  const response = await axiosInstance.put<UserProfile>(`${API_BASE}/users/${userId}`, payload);
  return response.data;
}

export async function changePassword(payload: ChangePasswordPayload) {
  const response = await axiosInstance.post<{ success: boolean; data: { status: 'ok' } }>(`${API_BASE}/auth/change-password`, payload);
  return response.data.data;
}

export async function requestPasswordReset(email: string) {
  const response = await axiosInstance.post<{ success: boolean; data: { status: 'ok' } }>(`${API_BASE}/auth/forgot-password`, { email });
  return response.data.data;
}

export async function getMyNotifications(userId: string) {
  const response = await axiosInstance.get<NotificationsPrefs>(`${API_BASE}/users/${userId}/notifications`);
  return response.data;
}

export async function updateMyNotifications(userId: string, payload: NotificationsPrefs) {
  const response = await axiosInstance.put<NotificationsPrefs>(`${API_BASE}/users/${userId}/notifications`, payload);
  return response.data;
}

export async function setProductSource(merchantId: string, source: ProductSource, confirmPassword: string) {
  const response = await axiosInstance.patch<{ success: boolean; data: unknown }>(`${API_BASE}/merchants/${merchantId}/product-source`, { source, confirmPassword });
  return response.data.data;
}

export async function deleteMyAccount(userId: string, payload: ConfirmPasswordPayload) {
  const response = await axiosInstance.post<{ success: boolean; data: { message?: string } }>(`${API_BASE}/users/${userId}/delete`, payload);
  return response.data.data;
}

export async function ensureN8nWorkflow(payload: { forceRecreate?: boolean; activate?: boolean }) {
  const response = await axiosInstance.post<{
    workflowId: string;
    recreated: boolean;
    activated: boolean;
  }>(`${API_BASE}/n8n/workflows/me/ensure`, payload);
  return response.data;
}
