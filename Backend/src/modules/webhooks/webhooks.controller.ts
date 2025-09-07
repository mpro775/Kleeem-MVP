// ---------------------------
// File: src/modules/webhooks/webhooks.controller.ts
// ---------------------------
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
} from '@nestjs/common';
import { MessageService } from '../messaging/message.service';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { normalizeIncomingMessage } from './schemas/utils/normalize-incoming';
import axios from 'axios';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
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

// NEW: القنوات الجديدة + فك التشفير
import { Channel, ChannelDocument, ChannelProvider } from '../channels/schemas/channel.schema';
import { decryptSecret, hashSecret } from '../channels/utils/secrets.util';

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

function verifyMetaSig(appSecret: string, raw: Buffer, sig?: string) {
  if (!sig) return false;
  const parts = sig.split('=');
  if (parts.length !== 2) return false;
  const scheme = parts[0];
  if (scheme !== 'sha256') return false;
  const theirs = Buffer.from(parts[1], 'hex');
  const ours = createHmac('sha256', appSecret).update(raw).digest();
  return theirs.length === ours.length && timingSafeEqual(theirs, ours);
}
async function tryWithTx<T>(
  conn: Connection,
  work: (session?: ClientSession) => Promise<T>
): Promise<T> {
  let session: ClientSession | undefined;
  try {
    session = await conn.startSession();
    return await session.withTransaction(() => work(session));
  } catch (e: any) {
    if (e?.code === 20 || /Transaction numbers are only allowed/i.test(e?.message)) {
      // Mongo بدون Replica Set → كمل بدون Transaction
      return await work(undefined);
    }
    throw e;
  } finally {
    try { await session?.endSession(); } catch {}
  }
}
@ApiTags('Webhooks')
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
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,

    // NEW: مجموعة القنوات
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
  ) {}

  // ================= Helpers (قناة افتراضية/تحقق/إرسال) =================

  /** احصل على القناة الافتراضية لمزوّد محدد */
  private async getDefaultChannel(
    merchantId: string,
    provider: 'telegram' | 'whatsapp_cloud' | 'whatsapp_qr' | 'webchat',
  ) {
    return this.channelModel.findOne({
      merchantId: new Types.ObjectId(merchantId),
      provider,
      isDefault: true,
      deletedAt: null,
    });
  }

 

  /** تحقّق إذا البوت مفعّل على القناة الافتراضية للمزوّد */
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
    const c = await this.getDefaultChannel(merchantId, provider as any);
    return !!c?.enabled;
  }

  /** إرسال رد (Telegram/WA Cloud/WA QR/Webchat) باختيار القناة المتاحة */
  private async sendReplyToChannel({
    merchantId,
    channel, // whatsapp | telegram | webchat
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

    // whatsapp: جرّب Cloud ثم QR كاحتياط
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

  private async verifyMetaSignature(merchantId: string, req: any): Promise<boolean> {
    const sig = req.headers['x-hub-signature-256']; // format: sha256=...
    if (!sig || !sig.startsWith('sha256=')) return false;

    // جيب قناة WA Cloud الافتراضية + فكّ appSecret
    const ch = await this.channelModel.findOne({
      merchantId: new Types.ObjectId(merchantId),
      provider: ChannelProvider.WHATSAPP_CLOUD,
      isDefault: true,
      deletedAt: null,
    }).select('+appSecretEnc').lean();

    const appSecret = ch?.appSecretEnc ? decryptSecret(ch.appSecretEnc) : undefined;
    if (!appSecret || !req['rawBody']) return false;

    const theirs = Buffer.from(sig.split('=')[1], 'hex');
    const ours = createHmac('sha256', appSecret).update(req['rawBody']).digest();
    return (theirs.length === ours.length) && timingSafeEqual(theirs, ours);
  }

  // ================= End Helpers =================

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

    if (mode !== 'subscribe' || !token) return res.status(400).send('Bad Request');

    // قارن verify_token مع المخزّن (hashed)
    const ch = await this.channelModel.findOne({
      merchantId: new Types.ObjectId(merchantId),
      provider: ChannelProvider.WHATSAPP_CLOUD,
      isDefault: true,
      deletedAt: null,
    }).select('+verifyTokenHash').lean();

    if (!ch?.verifyTokenHash) return res.status(404).send('Channel not found');

    const ok = await bcrypt.compare(token, ch.verifyTokenHash);
    if (!ok) return res.status(403).send('Forbidden');

    return res.status(200).send(challenge);
  }
  /**
   * استقبال الرسائل الواردة (مسار انتقالي قبل اعتماد /webhooks/:provider/:channelId)
   */

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
    @Req() req: any, // نحتاجه للـ rawBody + headers
  ) {

    if (req.headers['x-hub-signature-256']) {
      const ok = await this.verifyMetaSignature(merchantId, req);
      if (!ok) return { status: 'invalid_signature' };
    } 

    // 1) طبّع الحمولة
    const normalized = normalizeIncomingMessage(body, merchantId);

    // (اختياري) Idempotency: لو أضفت index فريد لـ sourceMessageId
    // if (normalized?.metadata?.sourceMessageId) {
    //   const exists = await this.messageService.existsBySourceId(normalized.metadata.sourceMessageId);
    //   if (exists) return { status: 'duplicate_ignored' };
    // }

    // 2) ملفات
    if (normalized.fileId || normalized.fileUrl) {
      let tmpPath: string | undefined;
      let originalName: string | undefined;
      const mimeType: string =
        normalized.mimeType || 'application/octet-stream';

      if (normalized.channel === 'telegram' && normalized.fileId) {
        // Telegram: احصل على توكن من قناة telegram
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

      // 3) خزّن وادفع للـ Outbox في معاملة
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
              routingKey: normalized.channel, // whatsapp | telegram | webchat
            },
            session,
          );
        });
        const uiMsg = {
          _id: undefined,                 // لو تقدر استرجع الـ _id من service أفضل (انظر ملاحظة 2 بالأسفل)
          role: 'customer' as const,
          text: normalized.text || '[تم استقبال ملف]',
          timestamp: normalized.timestamp,
          rating: null,
          feedback: null,
          merchantId,                     // مفيد للبث لغرفة التاجر إن أردت
          metadata: {
            ...normalized.metadata,
            mediaUrl: presignedUrl,
            mediaType: normalized.mediaType,
            fileName: originalName,
            mimeType,
          },
        };
        // بث للغرفة الخاصة بالجلسة
        this.chatGateway.sendMessageToSession(normalized.sessionId, uiMsg);
        return { status: 'ok', sessionId: normalized.sessionId };
      } finally {
        await session.endSession();
      }
    }

    // 4) تحقق الحقول النصّية
    if (
      !normalized.merchantId ||
      !normalized.sessionId ||
      !normalized.text ||
      !normalized.channel
    ) {
      throw new BadRequestException('Payload missing required fields');
    }

    // 5) رسائل نصّية
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
          tx
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
          tx as any
        );
      
        return doc;
      });
      
      // 6) Intents (كما هو)
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
      const last = Array.isArray(sessionDoc?.messages) && sessionDoc.messages.length
      ? sessionDoc.messages[sessionDoc.messages.length - 1]
      : null;
    
    const uiMsg = last ? {
      _id: String(last._id),
      role: last.role,
      text: last.text,
      timestamp: last.timestamp,
      rating: last.rating ?? null,
      feedback: last.feedback ?? null,
      merchantId: normalized.merchantId,
      metadata: last.metadata ?? normalized.metadata,
    } : {
      _id: undefined,
      role: 'customer' as const,
      text: normalized.text,
      timestamp: normalized.timestamp,
      rating: null,
      feedback: null,
      merchantId: normalized.merchantId,
      metadata: normalized.metadata,
    };
    
    // ✅ بث فوري للموظفين في لوحة التحكم
    this.chatGateway.sendMessageToSession(normalized.sessionId, uiMsg);
      // 7) handover
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
      
        const url = base + pathTpl.replace('{merchantId}', normalized.merchantId);
      
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
      await this.outbox.enqueueEvent({
        exchange: 'analytics.events',
        routingKey: 'webhook.error',
        eventType: 'webhook.error',
        aggregateType: 'webhook',
        aggregateId: merchantId,
        payload: { merchantId, error: err?.message, stack: err?.stack?.slice(0,1000) },
      }).catch(()=>{});
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

  /**
   * ردود البوت (عام)
   */
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
        {
          role: 'bot',
          text,
          timestamp: new Date(),
          metadata: metadata || {},
        },
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

  /**
   * ردّ اختبار للداشبورد فقط
   */
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
      example: {
        sessionId: 'dash-1727000000000',
        status: 'ok',
        test: true,
      },
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

  /**
   * ردود الموظف (Agent)
   * (تقدر تخليها محمية فقط بدون @Public حسب احتياجك)
   */
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
      _id: undefined, // أو احصل عليه مثل أعلاه
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
