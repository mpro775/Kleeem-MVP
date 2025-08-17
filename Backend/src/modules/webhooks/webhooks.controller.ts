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
} from '@nestjs/common';
import { MessageService } from '../messaging/message.service';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { normalizeIncomingMessage } from './schemas/utils/normalize-incoming';
import axios from 'axios';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
function detectOrderIntent(msg: string): {
  step: string;
  orderId?: string;
  phone?: string;
} {
  const phoneRegex = /^77\d{7}$/;
  const orderIdRegex = /^[0-9a-fA-F]{24}$/;

  msg = msg.trim();

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
    @InjectConnection() private readonly conn: Connection, // NEW
    private readonly outbox: OutboxService,
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}
  /**
   * إرسال رد إلى القناة المناسبة
   * @param sessionId معرف الجلسة
   * @param text نص الرد
   * @param channel القناة (whatsapp, telegram, webchat)
   * @param merchantId معرف التاجر
   */
  @ApiOperation({ summary: 'إرسال رد إلى القناة المناسبة' })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال الرد بنجاح'
  })
  async sendReplyToChannel({ sessionId, text, channel, merchantId }) {
    const merchant = await this.merchantModel.findById(merchantId).lean();
    if (!merchant) throw new Error('Merchant not found');

    if (channel === 'telegram') {
      const token = merchant.channels?.telegram?.token;
      if (!token) throw new Error('Telegram not configured');
      await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: sessionId,
        text,
        // parse_mode: 'HTML' // إن احتجتم تنسيق
      });
    } else if (channel === 'whatsapp') {
      const session = merchant.channels?.whatsapp?.sessionId;
      if (!session) throw new Error('WhatsApp not configured');
      await this.evoService.sendMessage(session, sessionId, text);
    } else if (channel === 'webchat') {
      this.chatGateway.sendMessageToSession(sessionId, {
        role: 'bot',
        text,
        ts: Date.now(),
      });
    }
  }
  @Public()
  @Post('incoming/:merchantId')
  @Post(':merchantId/incoming')
  @ApiOperation({ summary: 'معالجة الرسائل الواردة من القنوات' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({
    description: 'بيانات الرسالة الواردة',
    schema: {
      example: {
        message: {
          chat: { id: '12345' },
          text: 'مرحباً',
          from: { id: 'user123' }
        },
        fileId: 'file_123',
        fileUrl: 'https://example.com/file.jpg',
        mimeType: 'image/jpeg'
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'تم استلام الرسالة بنجاح',
    schema: {
      example: {
        success: true,
        message: 'تم استلام الرسالة',
        sessionId: 'session_123'
      }
    }
  })
  async handleIncoming(
    @Param('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    const normalized = normalizeIncomingMessage(body, merchantId);

    // ====== فرع الملفات (كما هو، مع إضافة Outbox بعد الحفظ) ======
    if (normalized.fileId || normalized.fileUrl) {
      let tmpPath: string | undefined;
      let originalName: string | undefined;
      const mimeType: string =
        normalized.mimeType || 'application/octet-stream';

      if (normalized.channel === 'telegram' && normalized.fileId) {
        const merchant = await this.merchantModel.findById(merchantId).lean();
        const telegramToken = merchant?.channels?.telegram?.token;
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

      const { presignedUrl } = await this.chatMediaService.uploadChatMedia(
        merchantId,
        tmpPath,
        originalName,
        mimeType,
      );

      // NEW: نفّذ حفظ+Outbox داخل معاملة لضمان at-least-once
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

          // NEW: ادفع حدث chat.incoming.<channel> للـ AI worker
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
              routingKey: normalized.channel, // whatsapp | telegram | web
            },
            session,
          );
        });

        return { status: 'ok', sessionId: normalized.sessionId };
      } finally {
        await session.endSession();
      }
    }

    // ====== تحقق الحقول النصيّة ======
    if (
      !normalized.merchantId ||
      !normalized.sessionId ||
      !normalized.text ||
      !normalized.channel
    ) {
      throw new BadRequestException('Payload missing required fields');
    }

    // ====== فرع الرسائل النصية (نفس منطقك + Outbox داخل معاملة) ======
    const tx = await this.conn.startSession();
    try {
      let sessionDoc: any;
      await tx.withTransaction(async () => {
        // 2. خزّن الرسالة
        sessionDoc = await this.messageService.createOrAppend(
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

        // NEW: ادفع الحدث إلى AI عبر Rabbit (بدل النداء المباشر للنود n8n)
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
          tx,
        );
      });

      // ====== نفس منطق الـ intents الخاص بك ======
      const intent = detectOrderIntent(normalized.text);

      if (intent.step === 'orderDetails') {
        const order = await this.ordersServices.findOne(intent.orderId!);
        const reply = buildOrderDetailsMessage(order);

        // NEW: خزّن ردّ البوت + Outbox للرد (بدل الإرسال المباشر)
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

        // (اختياري أثناء الانتقال) إرسال مباشر خلف Feature Flag
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

      // ====== handover (كما هو)
      const messages = sessionDoc.messages;
      const lastRole = messages.length
        ? messages[messages.length - 1].role
        : 'customer';
      const isHandover = sessionDoc.handoverToAgent === true;
      const merchant = await this.merchantModel.findById(merchantId).lean();
      const isBotEnabled =
        merchant?.channels?.[normalized.channel]?.enabled === true;

      if (lastRole === 'agent' || isHandover) {
        return {
          sessionId: normalized.sessionId,
          action: 'wait_agent',
          handoverToAgent: true,
          role: normalized.role,
        };
      }

      // CHANGED: بدل استدعاء n8n المباشر، احنا أصلاً دفعنا chat.incoming فوق.
      // لو تبغى تحافظ مؤقتًا على النداء المباشر (للتحقق/المقارنة) خلّه خلف علم:
      if (
        lastRole === 'customer' &&
        !isHandover &&
        isBotEnabled &&
        process.env.N8N_DIRECT_CALL_FALLBACK === 'true'
      ) {
        const base = this.config.get<string>('N8N_BASE')!.replace(/\/+$/, '');
        const url = `${base}/webhook/ai-agent`; // أو مسارك الحالي
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
      // نفس سلوكك: لا نفشل الويبهوك حتى لو صار خطأ
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
  @Post(':merchantId/bot-reply')
  @ApiOperation({ summary: 'معالجة ردود البوت الآلية' })
  @ApiParam({ name: 'merchantId', description: 'معرّف التاجر' })
  @ApiBody({
    description: 'بيانات رد البوت',
    schema: {
      example: {
        sessionId: 'session_123',
        text: 'مرحباً بك في خدمة العملاء',
        channel: 'whatsapp',
        metadata: {}
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال رد البوت بنجاح',
    schema: {
      example: {
        sessionId: 'session_123',
        status: 'ok'
      }
    }
  })
  async handleBotReply(
    @Param('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    const { sessionId, text, channel, metadata } = body;
    if (!merchantId || !sessionId || !text || !channel) {
      throw new BadRequestException('Payload missing required fields');
    }

    // خزّن الرسالة role='bot' في الجلسة
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

    // أرسل الرد للعميل في القناة المناسبة
    await this.sendReplyToChannel({ sessionId, text, channel, merchantId });

    return { sessionId, status: 'ok' };
  }
  @Post('agent-reply/:merchantId')
  @Post(':merchantId/agent-reply')
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
        metadata: {}
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال رد الموظف بنجاح',
    schema: {
      example: {
        sessionId: 'session_123'
      }
    }
  })
  async handleAgentReply(
    @Param('merchantId') merchantId: string,
    @Body() body: any,
  ) {
    const { sessionId, text, channel, metadata, agentId } = body;
    if (!merchantId || !sessionId || !text || !channel) {
      throw new BadRequestException('Payload missing required fields');
    }

    // خزّن الرسالة role='agent' في الجلسة
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

    // أرسل الرد للعميل في القناة المناسبة
    await this.sendReplyToChannel({ sessionId, text, channel, merchantId });

    return { sessionId };
  }
}
