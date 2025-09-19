import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';
import { ChannelProvider } from './schemas/channel.schema';
import { EvolutionService } from '../integrations/evolution.service';
import { WhatsappCloudService } from './whatsapp-cloud.service';
import { ChatGateway } from '../chat/chat.gateway';
import { TelegramAdapter } from './adapters/telegram.adapter';
import { ChannelsRepository } from './repositories/channels.repository';

type SendChannel = 'telegram' | 'whatsapp' | 'webchat';
type WaTransport = 'api' | 'qr';

@Injectable()
export class ChannelsDispatcherService {
  constructor(
    @Inject('ChannelsRepository') private readonly repo: ChannelsRepository,
    private readonly evo: EvolutionService,
    private readonly waCloud: WhatsappCloudService,
    private readonly chatGateway: ChatGateway,
    private readonly tgAdapter: TelegramAdapter,
  ) {}

  private async getDefault(merchantId: string, provider: ChannelProvider) {
    return this.repo.findDefault(new Types.ObjectId(merchantId), provider);
  }

  async send(
    merchantId: string,
    channel: SendChannel,
    sessionId: string,
    text: string,
    transport?: WaTransport,
  ) {
    if (channel === 'webchat') {
      this.chatGateway.sendMessageToSession(sessionId, {
        role: 'bot',
        text,
        ts: Date.now(),
      });
      return;
    }

    if (channel === 'telegram') {
      const tg = await this.getDefault(merchantId, ChannelProvider.TELEGRAM);
      if (!tg) throw new Error('Telegram not configured');
      await this.tgAdapter.sendMessage(tg as any, sessionId, text);
      return;
    }

    if (channel === 'whatsapp') {
      const use: WaTransport =
        transport ||
        (await this.waCloud.detectTransport(merchantId, sessionId));
      if (use === 'api') {
        try {
          await this.waCloud.sendText(merchantId, sessionId, text);
          return;
        } catch (e) {
          const qr = await this.getDefault(
            merchantId,
            ChannelProvider.WHATSAPP_QR,
          );
          if (!qr?.sessionId) throw e;
          await this.evo.sendMessage(qr.sessionId, sessionId, text);
          return;
        }
      }
      const qr = await this.getDefault(merchantId, ChannelProvider.WHATSAPP_QR);
      if (!qr?.sessionId) throw new Error('WhatsApp QR not configured');
      await this.evo.sendMessage(qr.sessionId, sessionId, text);
      return;
    }
  }
}
