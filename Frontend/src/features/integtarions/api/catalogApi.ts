import axios from "@/shared/api/axios";
import { API_BASE } from "@/context/config";

export async function syncCatalog(merchantId: string, token: string) {
  const { data } = await axios.post<{ imported: number; updated: number }>(
    `${API_BASE}/catalog/${merchantId}/sync`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return data;
}
