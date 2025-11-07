'use server';

import { redirect } from 'next/navigation';
import axiosInstance from '@/lib/axios';
import { createAuthToken, removeAuthToken, setAuthToken } from '@/lib/auth';
import type { User } from '@/lib/auth';

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // Call backend API
    const response = await axiosInstance.post<{
      user: User;
      accessToken: string;
    }>('/auth/login', {
      email,
      password,
    });

    const backendUser = response.data.user;

    // Map backend user to our User type
    const user: User = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: backendUser.role,
      merchantId: backendUser.merchantId || null,
      firstLogin: backendUser.firstLogin || false,
      emailVerified: backendUser.emailVerified || false,
      storeName: backendUser.storeName,
      storeLogoUrl: backendUser.storeLogoUrl,
      storeAvatarUrl: backendUser.storeAvatarUrl,
    };

    // Create and set auth token with full user data
    const authToken = await createAuthToken(user);
    await setAuthToken(authToken);

    return { success: true, user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'فشل تسجيل الدخول';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function signupAction(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const phone = formData.get('phone') as string;
  const storeName = formData.get('storeName') as string;

  try {
    const response = await axiosInstance.post<{
      user: User;
      accessToken: string;
    }>('/auth/signup', {
      name,
      email,
      password,
      phone,
      storeName,
    });

    const backendUser = response.data.user;

    // Map backend user to our User type
    const user: User = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: backendUser.role,
      merchantId: backendUser.merchantId || null,
      firstLogin: backendUser.firstLogin !== undefined ? backendUser.firstLogin : true,
      emailVerified: backendUser.emailVerified || false,
      storeName: backendUser.storeName,
      storeLogoUrl: backendUser.storeLogoUrl,
      storeAvatarUrl: backendUser.storeAvatarUrl,
    };

    const authToken = await createAuthToken(user);
    await setAuthToken(authToken);

    return { success: true, user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'فشل إنشاء الحساب';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function logoutAction() {
  await removeAuthToken();
  redirect('/ar/login');
}

export async function verifyEmailAction(code: string) {
  try {
    const email =
      typeof window !== 'undefined'
        ? localStorage.getItem('pendingEmail') || sessionStorage.getItem('pendingEmail')
        : null;
        
    const response = await axiosInstance.post<{
      user: User;
      accessToken: string;
    }>('/auth/verify-email', {
      email,
      code,
    });

    const backendUser = response.data.user;

    // Map backend user to our User type
    const user: User = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: backendUser.role,
      merchantId: backendUser.merchantId || null,
      firstLogin: backendUser.firstLogin !== undefined ? backendUser.firstLogin : true,
      emailVerified: true,
      storeName: backendUser.storeName,
      storeLogoUrl: backendUser.storeLogoUrl,
      storeAvatarUrl: backendUser.storeAvatarUrl,
    };

    const authToken = await createAuthToken(user);
    await setAuthToken(authToken);

    return { success: true, user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'رمز التحقق غير صحيح';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function forgotPasswordAction(email: string) {
  try {
    await axiosInstance.post('/auth/forgot-password', { email });
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'فشل إرسال رابط إعادة التعيين';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function resetPasswordAction(
  token: string,
  password: string
) {
  try {
    await axiosInstance.post('/auth/reset-password', {
      token,
      newPassword: password,
      confirmPassword: password,
    });
    return { success: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'فشل إعادة تعيين كلمة المرور';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

export async function validatePasswordResetTokenAction(
  email: string,
  token: string
): Promise<boolean> {
  try {
    const res = await axiosInstance.get('/auth/reset-password/validate', {
      params: { email, token },
    });
    return !!res.data?.valid;
  } catch {
    return false;
  }
}

export async function ensureMerchantAction() {
  try {
    const response = await axiosInstance.post<{
      user: User;
      accessToken: string;
    }>('/auth/ensure-merchant');

    const backendUser = response.data.user;

    // Map backend user to our User type
    const user: User = {
      id: backendUser.id,
      name: backendUser.name,
      email: backendUser.email,
      role: backendUser.role,
      merchantId: backendUser.merchantId || null,
      firstLogin: backendUser.firstLogin !== undefined ? backendUser.firstLogin : false,
      emailVerified: backendUser.emailVerified || false,
      storeName: backendUser.storeName,
      storeLogoUrl: backendUser.storeLogoUrl,
      storeAvatarUrl: backendUser.storeAvatarUrl,
    };

    // Update auth token with the new merchantId
    const authToken = await createAuthToken(user);
    await setAuthToken(authToken);

    return { success: true, user };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'فشل تهيئة المتجر';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

