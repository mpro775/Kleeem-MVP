import axios from "axios";
import { API_BASE } from "@/context/config";

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
  const { data } = await axios.patch(
    `${API_BASE}/merchants/${merchantId}/onboarding/basic`,
    payload,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
