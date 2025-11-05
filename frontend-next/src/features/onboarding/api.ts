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

