// src/features/mechant/channels/model.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "@/shared/api/axios";

export type ChannelProvider =
  | "telegram"
  | "whatsapp_cloud"
  | "whatsapp_qr"
  | "webchat"
  | "instagram"
  | "messenger";

export type ChannelDoc = {
  _id: string;
  merchantId: string;
  provider: ChannelProvider;
  enabled?: boolean;
  status?: string;
  webhookUrl?: string;
  sessionId?: string;
  instanceId?: string;
  phoneNumberId?: string;
  wabaId?: string;
  accountLabel?: string;
  widgetSettings?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export function useChannels(merchantId: string) {
  return useQuery({
    queryKey: ["channels", merchantId],
    queryFn: async () => {
      if (!merchantId) return [];
      const response = await axios.get(`/merchants/${merchantId}/channels`);
      console.log("API Response:", response);
      
      // Handle the response structure: { success: true, data: [...] }
      const channels = response.data?.data || response.data || [];
      console.log("Extracted channels:", channels);
      
      return channels;
    },
    enabled: !!merchantId,
  });
}

export function useUpdateChannelById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, partial }: { id: string; partial: Partial<ChannelDoc> }) => {
      const { data } = await axios.patch<ChannelDoc>(`/channels/${id}`, partial);
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channel", vars.id] });
    },
  });
}

export function useDeleteChannelById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: "disable" | "disconnect" | "wipe" }) => {
      const { data } = await axios.delete(`/channels/${id}`, { params: { mode } });
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useConnectChannelById() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload?: any }) => {
      const { data } = await axios.post(`/channels/${id}/actions/connect`, payload ?? {});
      return data; // {mode:'webhook'|...}
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["channel", vars.id] });
    },
  });
}

export function useChannelStatus(id?: string) {
  return useQuery({
    queryKey: ["channel", id, "status"],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await axios.get<{ status: string; details?: any }>(`/channels/${id}/status`);
      return data;
    },
    enabled: !!id,
    refetchInterval: 5000,
  });
}
