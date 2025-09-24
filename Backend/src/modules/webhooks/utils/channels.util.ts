// src/modules/webhooks/utils/channels.util.ts
import type { ChannelRepository } from '../repositories/channel.repository';
import type { Provider, PublicChannel } from '../types/channels';

export function toProvider(channel: PublicChannel): Provider | undefined {
  if (channel === 'whatsapp') return 'whatsapp_cloud';
  if (channel === 'telegram') return 'telegram';
  if (channel === 'webchat') return 'webchat';
  return undefined;
}

export async function isBotEnabled(
  merchantId: string,
  channel: PublicChannel,
  channelsRepo: ChannelRepository,
): Promise<boolean> {
  const provider = toProvider(channel);
  if (!provider) return false;
  const c = await channelsRepo.findDefault(merchantId, provider as never);
  return Boolean((c as { enabled?: boolean })?.enabled);
}
