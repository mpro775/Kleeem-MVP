// src/modules/channels/channels-dispatcher.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Channel,
  ChannelDocument,
  ChannelProvider,
} from './schemas/channel.schema';
import { EvolutionService } from '../integrations/evolution.service';
import { WhatsappCloudService } from './whatsapp-cloud.service';
import { ChatGateway } from '../chat/chat.gateway';
import { TelegramAdapter } from './adapters/telegram.adapter';

type SendChannel = 'telegram' | 'whatsapp' | 'webchat';
type WaTransport = 'api' | 'qr';

@Injectable()
export class ChannelsDispatcherService {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    private readonly evo: EvolutionService,
    private readonly waCloud: WhatsappCloudService,
    private readonly chatGateway: ChatGateway,
    private readonly tgAdapter: TelegramAdapter,
  ) {}

  private async getDefault(
    merchantId: string,
    provider: ChannelDocument['provider'],
  ) {
    return this.channelModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        provider,
        isDefault: true,
        deletedAt: null,
      })
      .lean();
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
          // ✳️ جرّب QR كخطة بديلة إذا Cloud فشل
          const qr = await this.getDefault(
            merchantId,
            ChannelProvider.WHATSAPP_QR,
          );
          if (!qr?.sessionId) throw e; // لا QR متاح
          await this.evo.sendMessage(qr.sessionId, sessionId, text);
          return;
        }
      }
      // use === 'qr'
      const qr = await this.getDefault(merchantId, ChannelProvider.WHATSAPP_QR);
      if (!qr?.sessionId) throw new Error('WhatsApp QR not configured');
      await this.evo.sendMessage(qr.sessionId, sessionId, text);
      return;
    }
  }
}
