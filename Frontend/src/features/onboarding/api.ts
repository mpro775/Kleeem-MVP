import axiosInstance from "@/shared/api/axios";

export type OnboardingBasicPayload = {
  name: string;
  phone?: string;
  businessType?: string;
  businessDescription?: string;
  categories?: string[];
  customCategory?: string;
  logoUrl?: string;
  addresses?: unknown[]; // إن أردت لاحقًا
};

export async function saveBasicInfo(
  merchantId: string,
  token: string,
  payload: OnboardingBasicPayload
) {
  // استخدام relative URL لأن axiosInstance لديه baseURL مضبوط بالفعل
  const { data } = await axiosInstance.patch(
    `/merchants/${merchantId}/onboarding/basic`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
