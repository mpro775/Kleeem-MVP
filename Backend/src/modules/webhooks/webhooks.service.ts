// src/modules/webhooks/webhooks.service.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { ForbiddenException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { OutboxService } from 'src/common/outbox/outbox.service';

import { decryptSecret } from '../channels/utils/secrets.util';
import { ChatGateway } from '../chat/chat.gateway';
import { EvolutionService } from '../integrations/evolution.service';
import { ChatMediaService } from '../media/chat-media.service';
import { MessageService } from '../messaging/message.service';
import { N8nForwarderService } from '../n8n-workflow/n8n-forwarder.service';
import { OrdersService } from '../orders/orders.service';

import { ChannelRepository } from './repositories/channel.repository';
import { WebhookRepository } from './repositories/webhook.repository';
import { WEBHOOK_REPOSITORY } from './tokens';
import { getIdempotency, setIdempotency } from './utils/cache.util';
import { isBotEnabled } from './utils/channels.util';
import {
  downloadRemoteFile,
  downloadTelegramFile,
} from './utils/download-files';
import { detectOrderIntent } from './utils/intents';
import { normalizeIncomingMessage } from './utils/normalize-incoming';
import { sendReplyToChannel } from './utils/replies.util';
import { verifyMetaSignature } from './utils/signature.util';
import { tryWithTx } from './utils/tx.util';

import type { Order } from './helpers/order';
import type { PublicChannel } from './types/channels';
import type {
  NormalizedIncomingMessage,
  WebhookActionResult,
} from './types/normalized-message.types';
import type { Cache } from 'cache-manager';
import type { Request } from 'express';
import type { ClientSession, Connection } from 'mongoose';

const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const IDEMPOTENCY_TTL_MS =
  HOURS_PER_DAY *
  MINUTES_PER_HOUR *
  SECONDS_PER_MINUTE *
  MILLISECONDS_PER_SECOND; // يوم واحد

@Injectable()
export class WebhooksService {
  constructor(
    private readonly messageService: MessageService,
    @InjectConnection() private readonly conn: Connection,
    private readonly outbox: OutboxService,
    @Inject(WEBHOOK_REPOSITORY)
    private readonly webhooksRepo: WebhookRepository,
    private readonly ordersServices: OrdersService,
    private readonly n8nForwarderService: N8nForwarderService,
    private readonly chatMediaService: ChatMediaService,
    private readonly evoService: EvolutionService,
    private readonly config: ConfigService,
    private readonly chatGateway: ChatGateway,
    @Inject('ChannelsRepository')
    private readonly channelsRepo: ChannelRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}
  // 1) GET subscription verification (Meta)
  verifyWebhookSubscription(
    merchantId: string,
    query: Record<string, unknown>,
  ): { status: HttpStatus; body: string } {
    const mode = typeof query['hub.mode'] === 'string' ? query['hub.mode'] : '';
    const token =
      typeof query['hub.verify_token'] === 'string'
        ? query['hub.verify_token']
        : '';
    const challenge =
      typeof query['hub.challenge'] === 'string' ? query['hub.challenge'] : '';

    if (mode !== 'subscribe' || !token) {
      return { status: HttpStatus.BAD_REQUEST, body: 'Bad Request' };
    }

    // التحقق سيتم في الـ Controller لاستدعاء الـ repo ثم bcrypt (حقّقناه هناك اختصارًا)
    return { status: HttpStatus.OK, body: challenge };
  }

  async verifyMetaSignatureIfPresent(
    merchantId: string,
    req: Request & { rawBody?: Buffer },
  ): Promise<void> {
    const hasSignature = typeof req.headers['x-hub-signature-256'] === 'string';
    if (!hasSignature) return;
    const ok = await verifyMetaSignature(merchantId, req, this.channelsRepo);
    if (!ok) throw new ForbiddenException('Invalid signature');
  }

  // 2) incoming main entry
  async processIncoming(
    merchantId: string,
    body: unknown,
    req: Request & { rawBody?: Buffer },
  ): Promise<
    WebhookActionResult | { status: string; sessionId?: string; error?: string }
  > {
    await this.verifyMetaSignatureIfPresent(merchantId, req);

    const normalized = normalizeIncomingMessage(
      body as Record<string, unknown>,
      merchantId,
    ) as NormalizedIncomingMessage;

    await this.ensureIdempotency(normalized);

    if (normalized.fileId || normalized.fileUrl) {
      return this.handleIncomingWithMedia(normalized);
    }

    this.ensureRequired(normalized);

    const sessionDoc = await this.persistIncoming(normalized);

    const intent = detectOrderIntent(normalized.text);
    const routed = await this.routeByIntent(
      normalized,
      intent.step,
      intent.orderId,
      intent.phone,
    );
    if (routed) return routed;

    return this.routeToAiIfEligible(normalized, sessionDoc);
  }

  private ensureRequired(n: NormalizedIncomingMessage): void {
    if (!n.merchantId || !n.sessionId || !n.text || !n.channel) {
      throw new BadRequestException('Payload missing required fields');
    }
  }

  private async ensureIdempotency(n: NormalizedIncomingMessage): Promise<void> {
    const sourceId = n?.metadata?.sourceMessageId;
    const channel = n?.metadata?.channel || 'unknown';
    if (!sourceId) return;
    const key = `idem:webhook:${channel}:${sourceId}`;
    if (await getIdempotency(this.cacheManager, key)) {
      throw new BadRequestException('duplicate_ignored');
    }
    await setIdempotency(this.cacheManager, key, IDEMPOTENCY_TTL_MS);
  }

  private async downloadMediaFile(
    n: NormalizedIncomingMessage,
  ): Promise<{ tmpPath: string; originalName: string }> {
    let tmpPath: string | undefined;
    let originalName: string | undefined = n.fileName;

    if (n.channel === 'telegram' && n.fileId) {
      const tg = await this.channelsRepo.findDefaultWithSecrets(
        n.merchantId,
        'telegram',
      );
      const tokenEnc = (tg as { botTokenEnc?: string })?.botTokenEnc;
      const telegramToken = tokenEnc ? decryptSecret(tokenEnc) : undefined;
      if (!telegramToken) throw new Error('Telegram token missing');
      const dl = await downloadTelegramFile(n.fileId, telegramToken);
      tmpPath = dl.tmpPath;
      originalName = originalName || dl.originalName;
    } else if (n.fileUrl) {
      const dl = await downloadRemoteFile(n.fileUrl, originalName);
      tmpPath = dl.tmpPath;
      originalName = originalName || dl.originalName;
    }

    if (!tmpPath) throw new Error('File path missing');
    if (!originalName) originalName = 'file';

    return { tmpPath, originalName };
  }

  private async handleIncomingWithMedia(
    n: NormalizedIncomingMessage,
  ): Promise<{ status: string; sessionId: string }> {
    const mimeType = n.mimeType || 'application/octet-stream';
    const { tmpPath, originalName } = await this.downloadMediaFile(n);

    const uploadResult = await this.chatMediaService.uploadChatMedia(
      n.merchantId,
      tmpPath,
      originalName,
      mimeType,
    );
    const presignedUrl =
      'url' in uploadResult ? uploadResult.url : uploadResult.presignedUrl;

    const session = await this.conn.startSession();
    try {
      await session.withTransaction(async () => {
        await this.messageService.createOrAppend(
          {
            merchantId: n.merchantId,
            sessionId: n.sessionId,
            channel: n.channel,
            messages: [
              {
                role: n.role,
                text: n.text || '[تم استقبال ملف]',
                timestamp:
                  n.timestamp instanceof Date
                    ? n.timestamp
                    : new Date(n.timestamp),
                metadata: {
                  ...n.metadata,
                  mediaUrl: presignedUrl,
                  mediaType: n.mediaType,
                  fileName: originalName,
                  mimeType,
                },
              },
            ],
          },
          session,
        );

        await this.outbox.enqueueEvent(
          {
            aggregateType: 'conversation',
            aggregateId: n.sessionId,
            eventType: 'chat.incoming',
            payload: {
              merchantId: n.merchantId,
              sessionId: n.sessionId,
              channel: n.channel,
              text: n.text || '[file]',
              metadata: {
                ...n.metadata,
                mediaUrl: presignedUrl,
                mediaType: n.mediaType,
                fileName: originalName,
                mimeType,
              },
            },
            exchange: 'chat.incoming',
            routingKey: n.channel,
          },
          session,
        );
      });

      this.chatGateway.sendMessageToSession(n.sessionId, {
        id: '',
        role: 'customer' as const,
        text: n.text || '[تم استقبال ملف]',
        timestamp: n.timestamp,
        rating: null,
        feedback: null,
        merchantId: n.merchantId,
        metadata: {
          ...n.metadata,
          mediaUrl: presignedUrl,
          mediaType: n.mediaType,
          fileName: originalName,
          mimeType,
        },
      });

      return { status: 'ok', sessionId: n.sessionId };
    } finally {
      await session.endSession();
    }
  }

  private async persistIncoming(n: NormalizedIncomingMessage): Promise<{
    messages: Array<{
      role: 'customer' | 'bot' | 'agent';
      text: string;
      timestamp: Date;
      metadata?: Record<string, unknown>;
    }>;
    handoverToAgent?: boolean;
  }> {
    return tryWithTx(this.conn, async (tx?: ClientSession) => {
      const doc = await this.messageService.createOrAppend(
        {
          merchantId: n.merchantId,
          sessionId: n.sessionId,
          channel: n.channel,
          messages: [
            {
              role: n.role,
              text: n.text,
              timestamp: n.timestamp as Date,
              metadata: n.metadata,
            },
          ],
        },
        tx,
      );

      await this.outbox.enqueueEvent(
        {
          aggregateType: 'conversation',
          aggregateId: n.sessionId,
          eventType: 'chat.incoming',
          payload: {
            merchantId: n.merchantId,
            sessionId: n.sessionId,
            channel: n.channel,
            text: n.text,
            metadata: n.metadata,
          },
          exchange: 'chat.incoming',
          routingKey: n.channel,
        },
        tx as ClientSession,
      );

      return doc as {
        messages: Array<{
          role: 'customer' | 'bot' | 'agent';
          text: string;
          timestamp: Date;
          metadata?: Record<string, unknown>;
        }>;
        handoverToAgent?: boolean;
      };
    });
  }

  private async routeByIntent(
    n: NormalizedIncomingMessage,
    step: 'orderDetails' | 'orders' | 'askPhone' | 'normal',
    orderId?: string,
    phone?: string,
  ): Promise<WebhookActionResult | null> {
    if (step === 'orderDetails' && orderId) {
      const order = await this.ordersServices.findOne(orderId);
      const reply = (
        await import('./helpers/order-format')
      ).buildOrderDetailsMessage(order as unknown as Order | null);
      await this.replyAndEmit(n, reply.text);
      await this.directSendIfEnabled(n, reply.text);
      return {
        sessionId: n.sessionId,
        action: 'orderDetails',
        handoverToAgent: false,
        role: n.role,
      };
    }

    if (step === 'orders' && phone) {
      const ordersFromDb = await this.ordersServices.findByCustomer(
        n.merchantId,
        phone,
      );
      const orders = ordersFromDb;
      const reply = (
        await import('./helpers/order-format')
      ).buildOrdersListMessage(orders as unknown as []);
      await this.replyAndEmit(n, reply.text);
      await this.directSendIfEnabled(n, reply.text);
      return {
        sessionId: n.sessionId,
        action: 'ordersList',
        handoverToAgent: false,
        role: n.role,
      };
    }

    if (step === 'askPhone') {
      const replyText = 'يرجى تزويدنا برقم الجوال الذي تم الطلب به.';
      await this.replyAndEmit(n, replyText);
      await this.directSendIfEnabled(n, replyText);
      return {
        sessionId: n.sessionId,
        action: 'askPhone',
        handoverToAgent: false,
        role: n.role,
      };
    }

    return null;
  }

  private async routeToAiIfEligible(
    n: NormalizedIncomingMessage,
    sessionDoc: {
      messages: Array<{ role: 'customer' | 'bot' | 'agent' }>;
      handoverToAgent?: boolean;
    },
  ): Promise<WebhookActionResult> {
    const messages = sessionDoc.messages || [];
    const lastRole = messages.length
      ? messages[messages.length - 1].role
      : 'customer';
    const isHandover = sessionDoc.handoverToAgent === true;
    const botEnabled = await isBotEnabled(
      n.merchantId,
      n.channel as PublicChannel,
      this.channelsRepo,
    );

    if (lastRole === 'agent' || isHandover) {
      return {
        sessionId: n.sessionId,
        action: 'wait_agent',
        handoverToAgent: true,
        role: n.role,
      };
    }

    const directCallFlag =
      this.config.get<string>('N8N_DIRECT_CALL_FALLBACK') === 'true';
    if (
      lastRole === 'customer' &&
      !isHandover &&
      botEnabled &&
      directCallFlag
    ) {
      // ✅ التفويض إلى n8n عبر داخلي + HMAC/Nonce/TS (الخطوة D)
      await this.n8nForwarderService.forward(n.merchantId, {
        merchantId: n.merchantId,
        sessionId: n.sessionId,
        channel: n.channel,
        text: n.text,
        metadata: n.metadata, // لو تحب تمرير سياق إضافي
        timestamp: Date.now(),
      });
    }

    return {
      sessionId: n.sessionId,
      action: 'ask_ai',
      handoverToAgent: false,
      role: n.role,
    };
  }

  private async replyAndEmit(
    n: NormalizedIncomingMessage,
    text: string,
  ): Promise<void> {
    await this.messageService.createOrAppend({
      merchantId: n.merchantId,
      sessionId: n.sessionId,
      channel: n.channel,
      messages: [{ role: 'bot', text, timestamp: new Date() }],
    });
    await this.outbox.enqueueEvent({
      aggregateType: 'conversation',
      aggregateId: n.sessionId,
      eventType: 'chat.reply',
      payload: {
        merchantId: n.merchantId,
        sessionId: n.sessionId,
        channel: n.channel,
        text,
      },
      exchange: 'chat.reply',
      routingKey: n.channel,
    });
  }

  private async directSendIfEnabled(
    n: NormalizedIncomingMessage,
    text: string,
  ): Promise<void> {
    if (process.env.DIRECT_SEND_FALLBACK === 'true') {
      await sendReplyToChannel(
        {
          merchantId: n.merchantId,
          sessionId: n.sessionId,
          channel: n.channel as PublicChannel,
          text,
        },
        this.channelsRepo,
        this.chatGateway,
        this.evoService,
      );
    }
  }

  // bot reply
  async handleBotReply(dto: {
    merchantId: string;
    sessionId: string;
    text: string;
    channel: PublicChannel;
    metadata?: Record<string, unknown>;
  }): Promise<{ sessionId: string; status: 'ok' }> {
    const { merchantId, sessionId, text, channel, metadata } = dto;
    if (!merchantId || !sessionId || !text || !channel) {
      throw new BadRequestException('Payload missing required fields');
    }

    await this.messageService.createOrAppend({
      merchantId,
      sessionId,
      channel,
      messages: [
        { role: 'bot', text, timestamp: new Date(), metadata: metadata || {} },
      ],
    });

    if (process.env.DIRECT_SEND_FALLBACK === 'true') {
      await sendReplyToChannel(
        { merchantId, sessionId, text, channel },
        this.channelsRepo,
        this.chatGateway,
        this.evoService,
      );
    } else {
      await this.outbox.enqueueEvent({
        aggregateType: 'conversation',
        aggregateId: sessionId,
        eventType: 'chat.reply',
        payload: { merchantId, sessionId, channel, text, metadata },
        exchange: 'chat.reply',
        routingKey: channel,
      });
    }

    return { sessionId, status: 'ok' };
  }

  async handleTestBotReply(dto: {
    merchantId: string;
    sessionId: string;
    text: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ sessionId: string; status: 'ok'; test: true }> {
    const { merchantId, sessionId, text, metadata } = dto;
    if (!merchantId || !sessionId || !text) {
      throw new BadRequestException('Payload missing required fields');
    }

    await this.messageService.createOrAppend({
      merchantId,
      sessionId,
      channel: 'dashboard-test',
      messages: [
        {
          role: 'bot',
          text,
          timestamp: new Date(),
          metadata: { ...(metadata || {}), test: true },
        },
      ],
    });

    this.chatGateway.sendMessageToSession(sessionId, {
      id: '',
      role: 'bot',
      text,
    });

    await this.outbox
      .enqueueEvent({
        aggregateType: 'conversation',
        aggregateId: sessionId,
        eventType: 'chat.testReply',
        payload: { merchantId, sessionId, channel: 'dashboard-test', text },
        exchange: 'chat.reply',
        routingKey: 'dashboard-test',
      })
      .catch(() => undefined);

    return { sessionId, status: 'ok', test: true };
  }

  async handleAgentReply(dto: {
    merchantId: string;
    sessionId: string;
    text: string;
    channel: PublicChannel;
    agentId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ sessionId: string }> {
    const { merchantId, sessionId, text, channel, agentId, metadata } = dto;
    if (!merchantId || !sessionId || !text || !channel) {
      throw new BadRequestException('Payload missing required fields');
    }

    await this.messageService.createOrAppend({
      merchantId,
      sessionId,
      channel,
      messages: [
        {
          role: 'agent',
          text,
          timestamp: new Date(),
          metadata: { ...(metadata || {}), agentId },
        },
      ],
    });

    this.chatGateway.sendMessageToSession(sessionId, {
      id: '',
      role: 'agent' as const,
      text,
      merchantId,
    });

    if (process.env.DIRECT_SEND_FALLBACK === 'true') {
      await sendReplyToChannel(
        { merchantId, sessionId, text, channel },
        this.channelsRepo,
        this.chatGateway,
        this.evoService,
      );
    } else {
      await this.outbox.enqueueEvent({
        aggregateType: 'conversation',
        aggregateId: sessionId,
        eventType: 'chat.reply',
        payload: { merchantId, sessionId, channel, text },
        exchange: 'chat.reply',
        routingKey: channel,
      });
    }

    return { sessionId };
  }

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
}
