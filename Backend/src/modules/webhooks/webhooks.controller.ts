import {
  Controller,
  Post,
  Body,
  Param,
  BadRequestException,
  UseGuards,
  Req,
  ForbiddenException,
  Get,
  Res,
  HttpCode,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MessageService } from '../messaging/message.service';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { normalizeIncomingMessage } from './schemas/utils/normalize-incoming';
import axios from 'axios';
import { InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Types } from 'mongoose';
import { OrdersService } from '../orders/orders.service';
import {
  buildOrderDetailsMessage,
  buildOrdersListMessage,
} from './helpers/order-format';
import { mapOrderDocumentToOrder } from './helpers/order-map';
import {
  downloadRemoteFile,
  downloadTelegramFile,
} from './schemas/utils/download-files';
import { ChatMediaService } from '../media/chat-media.service';
import { EvolutionService } from '../integrations/evolution.service';
import { ConfigService } from '@nestjs/config';
import { ChatGateway } from '../chat/chat.gateway';
import { OutboxService } from 'src/common/outbox/outbox.service';
import { TranslationService } from '../../common/services/translation.service';
import { createHmac, timingSafeEqual } from 'crypto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';

import { ChannelProvider } from '../channels/schemas/channel.schema';
import { decryptSecret } from '../channels/utils/secrets.util';

import { CHANNEL_REPOSITORY } from './tokens';
import { ChannelRepository } from './repositories/channel.repository';

// ================= Utils =================
function detectOrderIntent(msg: string): {
  step: string;
  orderId?: string;
  phone?: string;
} {
  const phoneRegex = /^77\d{7}$/;
  const orderIdRegex = /^[0-9a-fA-F]{24}$/;
  msg = (msg || '').trim();

  if (orderIdRegex.test(msg)) {
    return { step: 'orderDetails', orderId: msg };
  } else if (msg.includes('تفاصيل الطلب')) {
    const idMatch = msg.match(/[0-9a-fA-F]{24}/);
    if (idMatch) return { step: 'orderDetails', orderId: idMatch[0] };
  }
  if (phoneRegex.test(msg)) {
    return { step: 'orders', phone: msg };
  } else if (/طلباتي|حاله طلبي|الطلب/.test(msg)) {
    return { step: 'askPhone' };
  }
  return { step: 'normal' };
}

async function tryWithTx<T>(
  conn: Connection,
  work: (session?: ClientSession) => Promise<T>,
): Promise<T> {
  let session: ClientSession | undefined;
  try {
    session = await conn.startSession();
    return await session.withTransaction(() => work(session));
  } catch (e: any) {
    if (
      e?.code === 20 ||
      /Transaction numbers are only allowed/i.test(e?.message)
    ) {
      return await work(undefined);
    }
    throw e;
  } finally {
    try {
      await session?.endSession();
    } catch {}
  }
}

@ApiTags('webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly messageService: MessageService,
    private readonly ordersServices: OrdersService,
    private readonly chatMediaService: ChatMediaService,
    private readonly evoService: EvolutionService,
    private readonly config: ConfigService,
    private readonly chatGateway: ChatGateway,
    @InjectConnection() private readonly conn: Connection,
    private readonly outbox: OutboxService,
    @Inject(CHANNEL_REPOSITORY)
    private readonly channelsRepo: ChannelRepository,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly translationService: TranslationService,
  ) {}

  // ================= Helpers (قناة افتراضية/تحقق/إرسال) =================

  private async getDefaultChannel(
    merchantId: string,
    provider: 'telegram' | 'whatsapp_cloud' | 'whatsapp_qr' | 'webchat',
  ) {
    return this.channelsRepo.findDefaultWithSecrets(merchantId, provider);
  }

  private async isBotEnabled(
    merchantId: string,
    channel: string,
  ): Promise<boolean> {
    const provider =
      channel === 'whatsapp'
        ? 'whatsapp_cloud'
        : channel === 'telegram'
          ? 'telegram'
          : channel === 'webchat'
            ? 'webchat'
            : undefined;
    if (!provider) return false;
    const c = await this.channelsRepo.findDefault(merchantId, provider as any);
    return !!c?.enabled;
  }

  private async sendReplyToChannel({
    merchantId,
    channel,
    sessionId,
    text,
  }: {
    merchantId: string;
    channel: 'whatsapp' | 'telegram' | 'webchat';
    sessionId: string;
    text: string;
  }) {
    if (channel === 'webchat') {
      this.chatGateway.sendMessageToSession(sessionId, {
        role: 'bot',
        text,
        ts: Date.now(),
      });
      return;
    }

    if (channel === 'telegram') {
      const c = await this.getDefaultChannel(merchantId, 'telegram');
      const tokenEnc = c?.botTokenEnc;
      if (!tokenEnc) throw new Error('Telegram not configured');
      const token = decryptSecret(tokenEnc);
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: sessionId,
        text,
      });
      return;
    }

    const cloud = await this.getDefaultChannel(merchantId, 'whatsapp_cloud');
    if (cloud?.enabled && cloud.accessTokenEnc && cloud.phoneNumberId) {
      const accessToken = decryptSecret(cloud.accessTokenEnc);
      await axios.post(
        `https://graph.facebook.com/v19.0/${cloud.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: sessionId,
          type: 'text',
          text: { body: text },
        },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return;
    }

    const qr = await this.getDefaultChannel(merchantId, 'whatsapp_qr');
    if (qr?.enabled && qr.sessionId) {
      await this.evoService.sendMessage(qr.sessionId, sessionId, text);
      return;
    }

    throw new Error('WhatsApp not configured');
  }

  private async verifyMetaSignature(
    merchantId: string,
    req: any,
  ): Promise<boolean> {
    const sig = req.headers['x-hub-signature-256'];
    if (!sig || !sig.startsWith('sha256=')) return false;

    const ch =
      await this.channelsRepo.findDefaultWaCloudWithAppSecret(merchantId);
    const appSecret = (ch as any)?.appSecretEnc
      ? decryptSecret((ch as any).appSecretEnc)
      : undefined;
    if (!appSecret || !req['rawBody']) return false;

    const theirs = Buffer.from(sig.split('=')[1], 'hex');
    const ours = createHmac('sha256', appSecret)
      .update(req['rawBody'])
      .digest();
    return theirs.length === ours.length && timingSafeEqual(theirs, ours);
  }

  @Public()
  @Get(':merchantId/incoming')
  async verifyWebhook(
    @Param('merchantId') merchantId: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const mode = req.query['hub.mode'];
    const token = String(req.query['hub.verify_token'] || '');
    const challenge = req.query['hub.challenge'];

    if (mode !== 'subscribe' || !token)
      return res.status(400).send('Bad Request');

    const ch = await this.channelsRepo.findDefaultWaCloudWithVerify(merchantId);
    if (!(ch as any)?.verifyTokenHash)
      return res.status(404).send('Channel not found');

    const ok = await bcrypt.compare(token, (ch as any).verifyTokenHash);
    if (!ok) return res.status(403).send('Forbidden');

    return res.status(200).send(challenge);
  }

  @Public()
  @Post('incoming/:merchantId')
  @HttpCode(200)
  @ApiOperation({ summary: 'معالجة الرسائل الواردة من القنوات' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({
    description: 'بيانات الرسالة الواردة',
    schema: {
      example: {
        message: { chat: { id: '12345' }, text: 'مرحباً', from: { id: 'u1' } },
        fileId: 'file_123',
        fileUrl: 'https://example.com/file.jpg',
        mimeType: 'image/jpeg',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'تم الاستلام',
    schema: { example: { status: 'ok', sessionId: 'session_123' } },
  })
  async handleIncoming(
    @Param('merchantId') merchantId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    if (req.headers['x-hub-signature-256']) {
      const ok = await this.verifyMetaSignature(merchantId, req);
      if (!ok) throw new ForbiddenException('Invalid signature');
    }

    const normalized = normalizeIncomingMessage(body, merchantId);

    if (normalized?.metadata?.sourceMessageId) {
      const sourceId = normalized.metadata.sourceMessageId;
      const channel = normalized.metadata?.channel || 'unknown';
      const idempotencyKey = `idem:webhook:${channel}:${sourceId}`;

      const existing = await this.cacheManager.get(idempotencyKey);
      if (existing) {
        return { status: 'duplicate_ignored', sourceMessageId: sourceId };
      }
      await this.cacheManager.set(idempotencyKey, true, 24 * 60 * 60 * 1000);
    }

    if (normalized.fileId || normalized.fileUrl) {
      let tmpPath: string | undefined;
      let originalName: string | undefined;
      const mimeType: string =
        normalized.mimeType || 'application/octet-stream';

      if (normalized.channel === 'telegram' && normalized.fileId) {
        const tg = await this.getDefaultChannel(merchantId, 'telegram');
        const telegramToken = tg?.botTokenEnc
          ? decryptSecret(tg.botTokenEnc)
          : undefined;
        if (!telegramToken) throw new Error('Telegram token missing');
        const dl = await downloadTelegramFile(normalized.fileId, telegramToken);
        tmpPath = dl.tmpPath;
        originalName = normalized.fileName || dl.originalName;
      } else if (normalized.fileUrl) {
        const dl = await downloadRemoteFile(
          normalized.fileUrl,
          normalized.fileName,
        );
        tmpPath = dl.tmpPath;
        originalName = normalized.fileName || dl.originalName;
      }
      if (!originalName) originalName = 'file';
      if (!tmpPath) throw new Error('File path missing');

      const { url: presignedUrl } = await this.chatMediaService.uploadChatMedia(
        merchantId,
        tmpPath,
        originalName,
        mimeType,
      );

      const session = await this.conn.startSession();
      try {
        await session.withTransaction(async () => {
          await this.messageService.createOrAppend(
            {
              merchantId,
              sessionId: normalized.sessionId,
              channel: normalized.channel,
              messages: [
                {
                  role: normalized.role,
                  text: normalized.text || '[تم استقبال ملف]',
                  timestamp: normalized.timestamp,
                  metadata: {
                    ...normalized.metadata,
                    mediaUrl: presignedUrl,
                    mediaType: normalized.mediaType,
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
              aggregateId: normalized.sessionId,
              eventType: 'chat.incoming',
              payload: {
                merchantId,
                sessionId: normalized.sessionId,
                channel: normalized.channel,
                text: normalized.text || '[file]',
                metadata: {
                  ...normalized.metadata,
                  mediaUrl: presignedUrl,
                  mediaType: normalized.mediaType,
                  fileName: originalName,
                  mimeType,
                },
              },
              exchange: 'chat.incoming',
              routingKey: normalized.channel,
            },
            session,
          );
        });

        const uiMsg = {
          _id: undefined,
          role: 'customer' as const,
          text: normalized.text || '[تم استقبال ملف]',
          timestamp: normalized.timestamp,
          rating: null,
          feedback: null,
          merchantId,
          metadata: {
            ...normalized.metadata,
            mediaUrl: presignedUrl,
            mediaType: normalized.mediaType,
            fileName: originalName,
            mimeType,
          },
        };
        this.chatGateway.sendMessageToSession(normalized.sessionId, uiMsg);
        return { status: 'ok', sessionId: normalized.sessionId };
      } finally {
        await session.endSession();
      }
    }

    if (
      !normalized.merchantId ||
      !normalized.sessionId ||
      !normalized.text ||
      !normalized.channel
    ) {
      throw new BadRequestException('Payload missing required fields');
    }

    const tx = await this.conn.startSession();
    try {
      let sessionDoc: any;
      sessionDoc = await tryWithTx(this.conn, async (tx) => {
        const doc = await this.messageService.createOrAppend(
          {
            merchantId: normalized.merchantId,
            sessionId: normalized.sessionId,
            channel: normalized.channel,
            messages: [
              {
                role: normalized.role,
                text: normalized.text,
                timestamp: normalized.timestamp,
                metadata: normalized.metadata,
              },
            ],
          },
          tx,
        );

        await this.outbox.enqueueEvent(
          {
            aggregateType: 'conversation',
            aggregateId: normalized.sessionId,
            eventType: 'chat.incoming',
            payload: {
              merchantId: normalized.merchantId,
              sessionId: normalized.sessionId,
              channel: normalized.channel,
              text: normalized.text,
              metadata: normalized.metadata,
            },
            exchange: 'chat.incoming',
            routingKey: normalized.channel,
          },
          tx as any,
        );

        return doc;
      });

      const intent = detectOrderIntent(normalized.text);

      if (intent.step === 'orderDetails') {
        const order = await this.ordersServices.findOne(intent.orderId!);
        const reply = buildOrderDetailsMessage(order);

        await this.messageService.createOrAppend({
          merchantId,
          sessionId: normalized.sessionId,
          channel: normalized.channel,
          messages: [{ role: 'bot', text: reply.text, timestamp: new Date() }],
        });

        await this.outbox.enqueueEvent({
          aggregateType: 'conversation',
          aggregateId: normalized.sessionId,
          eventType: 'chat.reply',
          payload: {
            merchantId,
            sessionId: normalized.sessionId,
            channel: normalized.channel,
            text: reply.text,
          },
          exchange: 'chat.reply',
          routingKey: normalized.channel,
        });

        if (process.env.DIRECT_SEND_FALLBACK === 'true') {
          await this.sendReplyToChannel({
            sessionId: normalized.sessionId,
            text: reply.text,
            channel: normalized.channel,
            merchantId,
          });
        }

        return {
          sessionId: normalized.sessionId,
          action: 'orderDetails',
          handoverToAgent: false,
          role: normalized.role,
        };
      }

      if (intent.step === 'orders') {
        const ordersFromDb = await this.ordersServices.findByCustomer(
          merchantId,
          intent.phone!,
        );
        const orders = ordersFromDb.map(mapOrderDocumentToOrder);
        const reply = buildOrdersListMessage(orders);

        await this.messageService.createOrAppend({
          merchantId,
          sessionId: normalized.sessionId,
          channel: normalized.channel,
          messages: [{ role: 'bot', text: reply.text, timestamp: new Date() }],
        });

        await this.outbox.enqueueEvent({
          aggregateType: 'conversation',
          aggregateId: normalized.sessionId,
          eventType: 'chat.reply',
          payload: {
            merchantId,
            sessionId: normalized.sessionId,
            channel: normalized.channel,
            text: reply.text,
          },
          exchange: 'chat.reply',
          routingKey: normalized.channel,
        });

        if (process.env.DIRECT_SEND_FALLBACK === 'true') {
          await this.sendReplyToChannel({
            sessionId: normalized.sessionId,
            text: reply.text,
            channel: normalized.channel,
            merchantId,
          });
        }

        return {
          sessionId: normalized.sessionId,
          action: 'ordersList',
          handoverToAgent: false,
          role: normalized.role,
        };
      }

      if (intent.step === 'askPhone') {
        const reply = { text: 'يرجى تزويدنا برقم الجوال الذي تم الطلب به.' };

        await this.messageService.createOrAppend({
          merchantId,
          sessionId: normalized.sessionId,
          channel: normalized.channel,
          messages: [{ role: 'bot', text: reply.text, timestamp: new Date() }],
        });

        await this.outbox.enqueueEvent({
          aggregateType: 'conversation',
          aggregateId: normalized.sessionId,
          eventType: 'chat.reply',
          payload: {
            merchantId,
            sessionId: normalized.sessionId,
            channel: normalized.channel,
            text: reply.text,
          },
          exchange: 'chat.reply',
          routingKey: normalized.channel,
        });

        if (process.env.DIRECT_SEND_FALLBACK === 'true') {
          await this.sendReplyToChannel({
            sessionId: normalized.sessionId,
            text: reply.text,
            channel: normalized.channel,
            merchantId,
          });
        }

        return {
          sessionId: normalized.sessionId,
          action: 'askPhone',
          handoverToAgent: false,
          role: normalized.role,
        };
      }

      const last =
        Array.isArray(sessionDoc?.messages) && sessionDoc.messages.length
          ? sessionDoc.messages[sessionDoc.messages.length - 1]
          : null;

      const uiMsg = last
        ? {
            _id: String(last._id),
            role: last.role,
            text: last.text,
            timestamp: last.timestamp,
            rating: last.rating ?? null,
            feedback: last.feedback ?? null,
            merchantId: normalized.merchantId,
            metadata: last.metadata ?? normalized.metadata,
          }
        : {
            _id: undefined,
            role: 'customer' as const,
            text: normalized.text,
            timestamp: normalized.timestamp,
            rating: null,
            feedback: null,
            merchantId: normalized.merchantId,
            metadata: normalized.metadata,
          };

      this.chatGateway.sendMessageToSession(normalized.sessionId, uiMsg);

      const messages = sessionDoc.messages;
      const lastRole = messages.length
        ? messages[messages.length - 1].role
        : 'customer';
      const isHandover = sessionDoc.handoverToAgent === true;
      const botEnabled = await this.isBotEnabled(
        merchantId,
        normalized.channel,
      );

      if (lastRole === 'agent' || isHandover) {
        return {
          sessionId: normalized.sessionId,
          action: 'wait_agent',
          handoverToAgent: true,
          role: normalized.role,
        };
      }

      if (
        lastRole === 'customer' &&
        !isHandover &&
        botEnabled &&
        process.env.N8N_DIRECT_CALL_FALLBACK === 'true'
      ) {
        const base =
          this.config.get<string>('N8N_BASE_URL')?.replace(/\/+$/, '') ||
          this.config.get<string>('N8N_BASE')?.replace(/\/+$/, '') ||
          '';

        const pathTpl =
          this.config.get<string>('N8N_INCOMING_PATH') ||
          '/webhook/ai-agent-{merchantId}';

        const url =
          base + pathTpl.replace('{merchantId}', normalized.merchantId);

        await axios.post(url, {
          merchantId: normalized.merchantId,
          sessionId: normalized.sessionId,
          channel: normalized.channel,
          text: normalized.text,
        });
      }

      return {
        sessionId: normalized.sessionId,
        action: 'ask_ai',
        handoverToAgent: false,
        role: normalized.role,
      };
    } catch (err: any) {
      await this.outbox
        .enqueueEvent({
          exchange: 'analytics.events',
          routingKey: 'webhook.error',
          eventType: 'webhook.error',
          aggregateType: 'webhook',
          aggregateId: merchantId,
          payload: {
            merchantId,
            error: err?.message,
            stack: err?.stack?.slice(0, 1000),
          },
        })
        .catch(() => {});
      // eslint-disable-next-line no-console
      console.error('Webhook error:', err);
      return {
        sessionId: normalized.sessionId,
        status: 'received_with_error',
        error: err.message,
      };
    } finally {
      await tx.endSession();
    }
  }

  @Public()
  @Post('bot-reply/:merchantId')
  @ApiOperation({ summary: 'معالجة ردود البوت الآلية' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({
    description: 'بيانات رد البوت',
    schema: {
      example: {
        sessionId: 'session_123',
        text: 'مرحباً بك في خدمة العملاء',
        channel: 'whatsapp',
        metadata: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال رد البوت بنجاح',
    schema: { example: { sessionId: 'session_123', status: 'ok' } },
  })
  async handleBotReply(
    @Param('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    const { sessionId, text, channel, metadata } = body;
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
      await this.sendReplyToChannel({ sessionId, text, channel, merchantId });
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

  @Public()
  @Post(':merchantId/test-bot-reply')
  @ApiOperation({ summary: 'إرسال ردّ التستنج إلى الداشبورد فقط' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({
    description: 'بيانات ردّ التستنج',
    schema: {
      example: {
        sessionId: 'dash-1727000000000',
        text: 'ردّ الاختبار من الـ AI',
        channel: 'dashboard-test',
        metadata: { promptVersion: 'v3' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال ردّ التستنج بنجاح',
    schema: {
      example: { sessionId: 'dash-1727000000000', status: 'ok', test: true },
    },
  })
  async handleTestBotReply(
    @Param('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    const {
      sessionId,
      text,
      channel = 'dashboard-test',
      metadata,
    } = body || {};
    if (!merchantId || !sessionId || !text) {
      throw new BadRequestException('Payload missing required fields');
    }

    await this.messageService.createOrAppend({
      merchantId,
      sessionId,
      channel,
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
      role: 'bot',
      text,
      ts: Date.now(),
      meta: { test: true },
    });

    await this.outbox
      .enqueueEvent({
        aggregateType: 'conversation',
        aggregateId: sessionId,
        eventType: 'chat.testReply',
        payload: { merchantId, sessionId, channel, text },
        exchange: 'chat.reply',
        routingKey: 'dashboard-test',
      })
      .catch(() => {});

    return { sessionId, status: 'ok', test: true };
  }

  @Post('agent-reply/:merchantId')
  @ApiOperation({ summary: 'معالجة ردود الموظفين' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({
    description: 'بيانات رد الموظف',
    schema: {
      example: {
        sessionId: 'session_123',
        text: 'شكراً لتواصلك معنا',
        channel: 'whatsapp',
        agentId: 'agent_123',
        metadata: {},
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال رد الموظف بنجاح',
    schema: { example: { sessionId: 'session_123' } },
  })
  async handleAgentReply(
    @Param('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    const { sessionId, text, channel, metadata, agentId } = body;
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
          metadata: { ...metadata, agentId },
        },
      ],
    });

    const uiMsg = {
      _id: undefined,
      role: 'agent' as const,
      text,
      timestamp: new Date(),
      rating: null,
      feedback: null,
      merchantId,
      metadata: { ...metadata, agentId },
    };
    this.chatGateway.sendMessageToSession(sessionId, uiMsg);

    if (process.env.DIRECT_SEND_FALLBACK === 'true') {
      await this.sendReplyToChannel({ sessionId, text, channel, merchantId });
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
}
