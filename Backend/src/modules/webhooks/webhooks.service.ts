// src/modules/webhooks/webhooks.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { Webhook, WebhookDocument } from './schemas/webhook.schema';
import { MessageService } from '../messaging/message.service';
import { BotReplyDto } from './dto/bot-reply.dto';
import { OutboxService } from 'src/common/outbox/outbox.service';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly messageService: MessageService,
    @InjectModel(Webhook.name)
    private readonly webhookModel: Model<WebhookDocument>,
    @InjectConnection() private readonly conn: Connection, // NEW
    private readonly outbox: OutboxService, // NEW
  ) {}

  async handleEvent(eventType: string, payload: any) {
    const { merchantId, from, messageText, metadata } = payload;
    if (!merchantId || !from || !messageText)
      throw new BadRequestException(`Invalid payload`);

    const channel = eventType.replace('_incoming', '');
    const session = await this.conn.startSession();
    try {
      await session.withTransaction(async () => {
        await this.webhookModel.create(
          [
            {
              eventType,
              payload: JSON.stringify(payload),
              receivedAt: new Date(),
            },
          ],
          { session },
        );

        await this.messageService.createOrAppend(
          {
            merchantId,
            sessionId: from,
            channel,
            messages: [
              { role: 'customer', text: messageText, metadata: metadata || {} },
            ],
          },
          session,
        );

        await this.outbox.enqueueEvent(
          {
            aggregateType: 'conversation',
            aggregateId: from,
            eventType: 'chat.incoming',
            payload: {
              merchantId,
              sessionId: from,
              channel,
              text: messageText,
              metadata: metadata || {},
            },
            exchange: 'chat.incoming',
            routingKey: channel,
          },
          session,
        );
      });
      return { sessionId: from, status: 'accepted' };
    } finally {
      await session.endSession();
    }
  }

  async handleBotReply(
    merchantId: string,
    dto: BotReplyDto,
  ): Promise<{ sessionId: string; status: 'accepted' }> {
    const { sessionId, text, metadata } = dto;
    if (!sessionId || !text)
      throw new BadRequestException('sessionId و text مطلوبة');

    const session = await this.conn.startSession();
    try {
      await session.withTransaction(async () => {
        await this.messageService.createOrAppend(
          {
            merchantId,
            sessionId,
            channel: 'webchat',
            messages: [{ role: 'bot', text, metadata: metadata || {} }],
          },
          session,
        );

        await this.outbox.enqueueEvent(
          {
            aggregateType: 'conversation',
            aggregateId: sessionId,
            eventType: 'chat.reply',
            payload: {
              merchantId,
              sessionId,
              channel: 'webchat',
              text,
              metadata,
            },
            exchange: 'chat.reply',
            routingKey: 'web', // مسار الرد لقناة الويب
          },
          session,
        );
      });
      return { sessionId, status: 'accepted' };
    } finally {
      await session.endSession();
    }
  }
}
