// src/features/channels/api.ts
import axiosInstance from "@/shared/api/axios";
import type { ChannelsMap, ChannelData } from "./constants";

export async function getMerchantChannels(merchantId: string): Promise<ChannelsMap> {
  const { data } = await axiosInstance.get(`/merchants/${merchantId}`);
  return (data?.channels ?? {}) as ChannelsMap;
}

export async function patchChannelById(channelId: string, partial: Partial<ChannelData>) {
  return axiosInstance.patch(`/channels/${channelId}`, partial);
}

// يصبح:
export async function deleteChannelById(channelId: string, mode: 'disable'|'disconnect'|'wipe'='disconnect') {
  return axiosInstance.delete(`/channels/${channelId}`, { params: { mode } });
}


