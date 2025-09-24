import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';

import { ChatGateway } from '../chat/chat.gateway';
import { EvolutionService } from '../integrations/evolution.service';

import { TelegramAdapter } from './adapters/telegram.adapter';
import { ChannelsRepository } from './repositories/channels.repository';
import { ChannelDocument, ChannelProvider } from './schemas/channel.schema';
import { WhatsappCloudService } from './whatsapp-cloud.service';

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
  ): Promise<void> {
    if (channel === 'webchat') {
      this.chatGateway.sendMessageToSession(sessionId, {
        id: '',
        role: 'bot',
        text,
      });
      return;
    }

    if (channel === 'telegram') {
      const tg = await this.getDefault(merchantId, ChannelProvider.TELEGRAM);
      if (!tg) throw new Error('Telegram not configured');
      await this.tgAdapter.sendMessage(tg as ChannelDocument, sessionId, text);
      return;
    }

    if (channel === 'whatsapp') {
      const use: WaTransport =
        transport || (await this.waCloud.detectTransport(merchantId));
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
