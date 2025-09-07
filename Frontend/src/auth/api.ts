// src/features/auth/api.ts
import axiosInstance from "@/shared/api/axios";
import { API_BASE } from "../context/config";
import type { User } from "@/context/types";

export type AuthPayload = { accessToken: string; user: User };

export const loginAPI = async (
  email: string,
  password: string
): Promise<AuthPayload> => {
  const res = await axiosInstance.post(`${API_BASE}/auth/login`, {
    email,
    password,
  });
  // بفضل الـ normalizer: res.data = { accessToken, user }
  return res.data as AuthPayload;
};

export const signUpAPI = async (
  name: string,
  email: string,
  password: string,
  confirmPassword: string
): Promise<AuthPayload> => {
  const res = await axiosInstance.post(`${API_BASE}/auth/register`, {
    name,
    email,
    password,
    confirmPassword,
  });
  // نفس الشي: حمولة مباشرة
  return res.data as AuthPayload;
};

export async function ensureMerchant(token: string): Promise<AuthPayload> {
  const res = await axiosInstance.post(
    `${API_BASE}/auth/ensure-merchant`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data as AuthPayload;
}

export const verifyEmailAPI = async (
  email: string,
  code: string
): Promise<AuthPayload> => {
  const res = await axiosInstance.post(`${API_BASE}/auth/verify-email`, {
    email,
    code,
  });
  return res.data as AuthPayload;
};

export const resendVerificationAPI = async (email: string): Promise<void> => {
  await axiosInstance.post(`${API_BASE}/auth/resend-verification`, { email });
};
export async function requestPasswordResetAPI(email: string): Promise<void> {
  await axiosInstance.post(`${API_BASE}/auth/password-reset/request`, {
    email,
  });
}

export async function validatePasswordResetTokenAPI(
  email: string,
  token: string
): Promise<boolean> {
  const res = await axiosInstance.post(
    `${API_BASE}/auth/password-reset/validate`,
    { email, token }
  );
  // اقترح أن يرجع { ok: boolean } من الباك-إند
  return !!res.data?.ok;
}

export async function resetPasswordAPI(
  email: string,
  token: string,
  newPassword: string,
  confirmPassword: string
): Promise<void> {
  await axiosInstance.post(`${API_BASE}/auth/password-reset/reset`, {
    email,
    token,
    newPassword,
    confirmPassword,
  });
}
