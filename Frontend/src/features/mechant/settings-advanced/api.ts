import axiosInstanceInstance from '@/shared/api/axiosInstance';
import type { UserProfile, UpdateProfilePayload, NotificationsPrefs, ChangePasswordPayload, ProductSource, ConfirmPasswordPayload } from './types';

export async function getMyProfile(userId: string) {
  const response = await axiosInstance.get<UserProfile>(`/users/${userId}`);
  return response.data; // ✅
}

export async function updateMyProfile(userId: string, payload: UpdateProfilePayload) {
  const response = await axiosInstance.put<UserProfile>(`/users/${userId}`, payload);
  return response.data; // ✅
}

export async function changePassword(payload: ChangePasswordPayload) {
  const response = await axiosInstance.post<{ success: boolean; data: { status: 'ok' } }>(`/auth/change-password`, payload);
  return response.data.data;
}

export async function requestPasswordReset(email: string) {
  const response = await axiosInstance.post<{ success: boolean; data: { status: 'ok' } }>(`/auth/forgot-password`, { email });
  return response.data.data;
}

// Notifications
export async function getMyNotifications(userId: string) {
  const response = await axiosInstance.get<NotificationsPrefs>(`/users/${userId}/notifications`);
  return response.data; // ✅
}
export async function updateMyNotifications(userId: string, payload: NotificationsPrefs) {
  const response = await axiosInstance.put<NotificationsPrefs>(`/users/${userId}/notifications`, payload);
  return response.data; // ✅
}

// Product source (requires password confirm)
export async function setProductSource(merchantId: string, source: ProductSource, confirmPassword: string) {
  const response = await axiosInstance.patch<{ success: boolean; data: any }>(`/merchants/${merchantId}/product-source`, { source, confirmPassword });
  return response.data.data;
}

// Delete account with password
export async function deleteMyAccount(userId: string, payload: ConfirmPasswordPayload) {
  const response = await axiosInstance.post<{ success: boolean; data: { message?: string } }>(`/users/${userId}/delete`, payload);
  return response.data.data;
}

// n8n Workflow management
export async function ensureN8nWorkflow(payload: { forceRecreate?: boolean; activate?: boolean }) {
  const response = await axiosInstance.post<{
    workflowId: string;
    recreated: boolean;
    activated: boolean;
  }>("/n8n/workflows/me/ensure", payload);
  return response.data;
}
