// src/modules/webhooks/whatsapp-qr.webhook.controller.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  Req,
  Inject,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Throttle } from '@nestjs/throttler';
import { Cache } from 'cache-manager';
import { Model } from 'mongoose';
import { Public } from 'src/common/decorators/public.decorator';
import { WebhookSignatureGuard } from 'src/common/guards/webhook-signature.guard';
import { preventDuplicates, idemKey } from 'src/common/utils/idempotency.util';

import {
  Channel,
  ChannelDocument,
  ChannelStatus,
} from '../channels/schemas/channel.schema';
import { mapEvoStatus } from '../channels/utils/evo-status.util';

import { WhatsAppQrDto } from './dto/whatsapp-qr.dto';
import { WebhooksController } from './webhooks.controller';

@Public()
@Controller('webhooks/whatsapp_qr')
export class WhatsappQrWebhookController {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    private readonly webhooksController: WebhooksController,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post(':channelId')
  @UseGuards(WebhookSignatureGuard)
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_INCOMING_TTL || '10'),
      limit: parseInt(process.env.WEBHOOKS_INCOMING_LIMIT || '1'),
    },
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async incoming(
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body() body: WhatsAppQrDto,
  ) {
    return this.handleAny(channelId, req, body, undefined);
  }

  @Post(':channelId/event')
  @UseGuards(WebhookSignatureGuard)
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_INCOMING_TTL || '10'),
      limit: parseInt(process.env.WEBHOOKS_INCOMING_LIMIT || '1'),
    },
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async incomingEvent(
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body() body: WhatsAppQrDto,
  ) {
    return this.handleAny(channelId, req, body, 'event');
  }

  @Post(':channelId/:evt')
  @UseGuards(WebhookSignatureGuard)
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_INCOMING_TTL || '10'),
      limit: parseInt(process.env.WEBHOOKS_INCOMING_LIMIT || '1'),
    },
  })
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async incomingAny(
    @Param('channelId') channelId: string,
    @Param('evt') evt: string,
    @Req() req: any,
    @Body() body: WhatsAppQrDto,
  ) {
    return this.handleAny(channelId, req, body, evt);
  }

  private async handleAny(
    channelId: string,
    req: any,
    body: WhatsAppQrDto,
    evt?: string,
  ) {
    // ✅ تم التحقق بواسطة الحارس — معنا الآن:
    // req.merchantId, req.channel
    const merchantId = String(req.merchantId);
    if (!merchantId) throw new NotFoundException('Merchant not resolved');

    // حدّث حالة القناة إن وُجدت إشارة
    const chDoc = await this.channelModel.findById(channelId);
    if (!chDoc) throw new NotFoundException('channel not found');

    const evoState =
      body?.status ||
      body?.instance?.status ||
      body?.connection ||
      body?.event?.status;
    const mapped = mapEvoStatus(evoState);
    if (mapped) {
      chDoc.status = mapped;
      if (mapped === ChannelStatus.CONNECTED) chDoc.qr = undefined;
      await chDoc.save();
    }

    // فرد body.data.messages إن كانت موجودة
    const effective = Array.isArray(body?.data?.messages) ? body.data : body;

    // Idempotency: messages[0].key.id
    const messages = effective?.messages;
    if (Array.isArray(messages) && messages.length > 0) {
      const messageId = messages[0]?.key?.id || messages[0]?.id;
      if (messageId) {
        const key = idemKey({
          provider: 'whatsapp_qr',
          channelId,
          merchantId,
          messageId,
        });
        if (await preventDuplicates(this.cacheManager, key)) {
          return { status: 'duplicate_ignored', messageId };
        }
      }
    }

    // مرّر للمعالجة الموحدة لديك
    return this.webhooksController.handleIncoming(
      merchantId,
      { provider: 'whatsapp_qr', channelId, event: evt, ...effective },
      req,
    );
  }
}
