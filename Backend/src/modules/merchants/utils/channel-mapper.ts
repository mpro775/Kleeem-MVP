// src/merchants/utils/channel-mapper.ts

import { ChannelDetailsDto } from '../dto/channel.dto';
import { ChannelConfig } from '../schemas/channel.schema';

/**
 * يحول ChannelDetailsDto أو ChannelConfig جزئي إلى ChannelConfig
 * مضمناً enabled دوماً boolean صريحاً.
 */
export function mapToChannelConfig(
  incoming?: ChannelDetailsDto | ChannelConfig,
  existing?: ChannelConfig,
): ChannelConfig {
  return {
    enabled: incoming?.enabled ?? existing?.enabled ?? false,
    phone: incoming?.phone ?? existing?.phone,
    token: incoming?.token ?? existing?.token,
    chatId: incoming?.chatId ?? existing?.chatId,
    widgetSettings: incoming?.widgetSettings ?? existing?.widgetSettings ?? {},
    webhookUrl:
      // إذا incoming لديه webhookUrl استخدمها،
      // وإلا حاول قراءتها من existing (قد تكون undefined)
      (incoming as any)?.webhookUrl ?? (existing as any)?.webhookUrl,
  };
}
