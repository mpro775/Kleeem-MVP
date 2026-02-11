import axiosInstance from '@/shared/api/axios';
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
  const response = await axiosInstance.post<{ status: string; message: string }>(`/auth/change-password`, payload);
  return response.data;
}

export async function requestPasswordReset(email: string) {
  const response = await axiosInstance.post<{ status?: string; message?: string }>(`/auth/forgot-password`, { email });
  return response.data;
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
  const response = await axiosInstance.patch<{ merchant: unknown; sync: unknown }>(`/merchants/${merchantId}/product-source`, { source, confirmPassword });
  return response.data;
}

// Delete account with password
export async function deleteMyAccount(userId: string, payload: ConfirmPasswordPayload) {
  const response = await axiosInstance.post<{ message?: string } | void>(`/users/${userId}/delete`, payload);
  return response.data;
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
