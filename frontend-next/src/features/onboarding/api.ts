import axiosInstance from '@/lib/axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export type OnboardingBasicPayload = {
  name: string;
  phone?: string;
  businessType?: string;
  businessDescription?: string;
  categories?: string[];
  customCategory?: string;
  logoUrl?: string;
  addresses?: unknown[];
};

export type AuthPayload = {
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
    merchantId: string | null;
    firstLogin: boolean;
    emailVerified: boolean;
    storeName?: string;
    storeLogoUrl?: string;
    storeAvatarUrl?: string;
  };
  accessToken: string;
};

export async function ensureMerchant(token: string): Promise<AuthPayload> {
  const { data } = await axiosInstance.post<AuthPayload>(
    `${API_BASE}/auth/ensure-merchant`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

export async function saveBasicInfo(
  merchantId: string,
  token: string,
  payload: OnboardingBasicPayload
) {
  const { data } = await axiosInstance.patch(
    `${API_BASE}/merchants/${merchantId}/onboarding/basic`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}

