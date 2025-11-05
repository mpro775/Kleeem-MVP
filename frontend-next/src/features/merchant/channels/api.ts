import axiosInstance from '@/lib/api/axios';
import type { ChannelDoc, ChannelProvider } from './types';

export async function fetchChannels(merchantId: string): Promise<ChannelDoc[]> {
  const response = await axiosInstance.get<ChannelDoc[]>(`/merchants/${merchantId}/channels`);
  return response.data || [];
}

export async function createChannel(merchantId: string, provider: ChannelProvider): Promise<ChannelDoc> {
  const response = await axiosInstance.post<ChannelDoc>(`/merchants/${merchantId}/channels`, {
    provider,
    isDefault: true,
  });
  return response.data;
}

export async function updateChannel(channelId: string, partial: Partial<ChannelDoc>): Promise<ChannelDoc> {
  const response = await axiosInstance.patch<ChannelDoc>(`/channels/${channelId}`, partial);
  return response.data;
}

export async function deleteChannel(channelId: string, mode: 'disable' | 'disconnect' | 'wipe'): Promise<void> {
  await axiosInstance.delete(`/channels/${channelId}`, {
    params: { mode },
  });
}

