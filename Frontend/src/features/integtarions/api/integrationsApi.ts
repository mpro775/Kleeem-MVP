import axiosInstance from "@/shared/api/axios";
import { API_BASE } from "@/context/config";

export type IntegrationsStatus = {
  productSource: "internal" | "salla" | "zid";
  skipped?: true;
  salla?: {
    active: boolean;
    connected: boolean;
    lastSync: string | null;
  };
  zid?: {
    active: boolean;
    connected: boolean;
    lastSync: string | null;
  };
};

export async function getIntegrationsStatus(token: string) {
  const { data } = await axiosInstance.get<IntegrationsStatus>(
    `${API_BASE}/integrations/status`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
}
