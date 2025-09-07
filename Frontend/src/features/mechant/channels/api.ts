// src/features/channels/api.ts
import axios from "@/shared/api/axios";
import type { ChannelsMap, ChannelData } from "./constants";

export async function getMerchantChannels(merchantId: string): Promise<ChannelsMap> {
  const { data } = await axios.get(`/merchants/${merchantId}`);
  return (data?.channels ?? {}) as ChannelsMap;
}

export async function patchChannelById(channelId: string, partial: Partial<ChannelData>) {
  return axios.patch(`/channels/${channelId}`, partial);
}

// يصبح:
export async function deleteChannelById(channelId: string, mode: 'disable'|'disconnect'|'wipe'='disconnect') {
  return axios.delete(`/channels/${channelId}`, { params: { mode } });
}


