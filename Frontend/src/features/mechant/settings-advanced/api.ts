import axios from '@/shared/api/axios';
import type { UserProfile, UpdateProfilePayload, NotificationsPrefs, ChangePasswordPayload, ProductSource, ConfirmPasswordPayload } from './types';

export async function getMyProfile(userId: string) {
  const response = await axios.get<UserProfile>(`/users/${userId}`);
  return response.data; // ✅
}

export async function updateMyProfile(userId: string, payload: UpdateProfilePayload) {
  const response = await axios.put<UserProfile>(`/users/${userId}`, payload);
  return response.data; // ✅
}

export async function changePassword(payload: ChangePasswordPayload) {
  const response = await axios.post<{ success: boolean; data: { status: 'ok' } }>(`/auth/change-password`, payload);
  return response.data.data;
}

export async function requestPasswordReset(email: string) {
  const response = await axios.post<{ success: boolean; data: { status: 'ok' } }>(`/auth/forgot-password`, { email });
  return response.data.data;
}

// Notifications
export async function getMyNotifications(userId: string) {
  const response = await axios.get<NotificationsPrefs>(`/users/${userId}/notifications`);
  return response.data; // ✅
}
export async function updateMyNotifications(userId: string, payload: NotificationsPrefs) {
  const response = await axios.put<NotificationsPrefs>(`/users/${userId}/notifications`, payload);
  return response.data; // ✅
}

// Product source (requires password confirm)
export async function setProductSource(merchantId: string, source: ProductSource, confirmPassword: string) {
  const response = await axios.patch<{ success: boolean; data: any }>(`/merchants/${merchantId}/product-source`, { source, confirmPassword });
  return response.data.data;
}

// Delete account with password
export async function deleteMyAccount(userId: string, payload: ConfirmPasswordPayload) {
  const response = await axios.post<{ success: boolean; data: { message?: string } }>(`/users/${userId}/delete`, payload);
  return response.data.data;
}
