// src/modules/channels/utils/evo-status.util.ts
import { ChannelStatus } from '../../channels/schemas/channel.schema';

export function mapEvoStatus(
  s?: Record<string, unknown>,
): ChannelStatus | undefined {
  const raw = String(
    (typeof s?.status === 'string' ? s.status : '') ||
      (typeof s === 'string' ? s : ''),
  ).toLowerCase();
  // غطّي أشهر القيم المتداولة:
  if (['connected', 'open', 'authenticated', 'online'].includes(raw))
    return ChannelStatus.CONNECTED;
  if (['closed', 'disconnected', 'offline'].includes(raw))
    return ChannelStatus.DISCONNECTED;
  if (['pairing', 'qr', 'qrcode', 'loading', 'initializing'].includes(raw))
    return ChannelStatus.PENDING;
  return undefined;
}
