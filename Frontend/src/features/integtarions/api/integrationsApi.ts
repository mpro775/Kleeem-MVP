import axios from "axios";
import { API_BASE } from "@/context/config";

export type IntegrationsStatus = {
  salla?: { active?: boolean; connected?: boolean; lastSync?: string | null };
  zid?: { active?: boolean; connected?: boolean; lastSync?: string | null };
};

export async function getIntegrationsStatus(token: string) {
  const { data } = await axios.get<IntegrationsStatus>(
    `${API_BASE}/integrations/status`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
}
