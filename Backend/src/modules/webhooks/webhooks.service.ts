import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection } from 'mongoose';
import { OutboxService } from 'src/common/outbox/outbox.service';

import { MessageService } from '../messaging/message.service';

import { BotReplyDto } from './dto/bot-reply.dto';
import { WebhookRepository } from './repositories/webhook.repository';
import { WEBHOOK_REPOSITORY } from './tokens';

@Injectable()
export class WebhooksService {
  constructor(
    private readonly messageService: MessageService,
    @InjectConnection() private readonly conn: Connection,
    private readonly outbox: OutboxService,
    @Inject(WEBHOOK_REPOSITORY)
    private readonly webhooksRepo: WebhookRepository,
  ) {}

  private async appendAndEnqueue(
    merchantId: string,
    sessionId: string,
    channel: string,
    message: {
      role: 'customer' | 'bot' | 'agent';
      text: string;
      metadata?: Record<string, unknown>;
    },
    outboxEvent:
      | { type: 'chat.incoming'; routingKey: string }
      | { type: 'chat.reply'; routingKey: string },
    dbSession?: ClientSession,
  ) {
    await this.messageService.createOrAppend(
      {
        merchantId,
        sessionId,
        channel,
        messages: [
          {
            role: message.role,
            text: message.text,
            metadata: message.metadata || {},
          },
        ],
      },
      dbSession,
    );

    await this.outbox.enqueueEvent(
      {
        aggregateType: 'conversation',
        aggregateId: sessionId,
        eventType: outboxEvent.type,
        payload: {
          merchantId,
          sessionId,
          channel,
          text: message.text,
          metadata: message.metadata || {},
        },
        exchange: outboxEvent.type,
        routingKey: outboxEvent.routingKey,
      },
      dbSession as ClientSession,
    );
  }

  async handleEvent(
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<{ sessionId: string; status: 'accepted' }> {
    const { merchantId, from, messageText, metadata } = payload || {};
    if (!merchantId || !from || !messageText) {
      throw new BadRequestException(`Invalid payload`);
    }
    const channel = eventType.replace('_incoming', '');

    const session = await this.conn.startSession();
    try {
      await session.withTransaction(async () => {
        await this.webhooksRepo.createOne(
          {
            eventType,
            payload: JSON.stringify(payload),
            receivedAt: new Date(),
          },
          { session },
        );

        await this.appendAndEnqueue(
          merchantId as string,
          from as string,
          channel,
          {
            role: 'customer',
            text: messageText as string,
            metadata: metadata as Record<string, unknown>,
          },
          { type: 'chat.incoming', routingKey: channel },
          session,
        );
      });

      return { sessionId: from as string, status: 'accepted' };
    } finally {
      await session.endSession();
    }
  }

  async handleBotReply(
    merchantId: string,
    dto: BotReplyDto,
  ): Promise<{ sessionId: string; status: 'accepted' }> {
    const { sessionId, text, metadata } = dto || {};
    if (!sessionId || !text) {
      throw new BadRequestException('sessionId و text مطلوبة');
    }

    const session = await this.conn.startSession();
    try {
      await session.withTransaction(async () => {
        await this.appendAndEnqueue(
          merchantId,
          sessionId,
          'webchat',
          { role: 'bot', text, metadata },
          { type: 'chat.reply', routingKey: 'webchat' },
          session,
        );
      });

      return { sessionId, status: 'accepted' };
    } finally {
      await session.endSession();
    }
  }
}
