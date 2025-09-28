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
  UseInterceptors,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Throttle } from '@nestjs/throttler';
import { Cache } from 'cache-manager';
import { Model } from 'mongoose';
import { Public } from 'src/common/decorators/public.decorator';
import { WebhookSignatureGuard } from 'src/common/guards/webhook-signature.guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { preventDuplicates, idemKey } from 'src/common/utils/idempotency.util';

import { ChannelSecretsLean } from '../channels/repositories/channels.repository';
import {
  Channel,
  ChannelDocument,
  ChannelStatus,
} from '../channels/schemas/channel.schema';
import { mapEvoStatus } from '../channels/utils/evo-status.util';

import { WhatsAppQrDto } from './dto/whatsapp-qr.dto';
import { WebhookLoggingInterceptor } from './interceptors/webhook-logging.interceptor';
import { WebhooksController } from './webhooks.controller';
interface RequestWithWebhookData extends RequestWithUser {
  merchantId: string;
  channel: ChannelSecretsLean;
}

@Public()
@UseInterceptors(WebhookLoggingInterceptor)
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
    @Req() req: RequestWithWebhookData,
    @Body() body: WhatsAppQrDto,
  ): Promise<void> {
    await this.handleAny(channelId, req, body, undefined);
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
    @Req() req: RequestWithWebhookData,
    @Body() body: WhatsAppQrDto,
  ): Promise<void> {
    await this.handleAny(channelId, req, body, 'event');
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
    @Req() req: RequestWithWebhookData,
    @Body() body: WhatsAppQrDto,
  ): Promise<void> {
    await this.handleAny(channelId, req, body, evt);
  }

  private extractEvoState(body: WhatsAppQrDto): string | undefined {
    return (
      body?.status ||
      body?.instance?.status ||
      body?.connection ||
      body?.event?.status
    );
  }

  private async updateChannelStatus(
    channelId: string,
    evoState: string | undefined,
  ): Promise<void> {
    if (!evoState) return;

    const chDoc = await this.channelModel.findById(channelId);
    if (!chDoc) throw new NotFoundException('channel not found');

    const mapped = mapEvoStatus(evoState as unknown as Record<string, unknown>);
    if (mapped) {
      chDoc.status = mapped;
      if (mapped === ChannelStatus.CONNECTED) chDoc.qr = undefined;
      await chDoc.save();
    }
  }

  private getEffectiveBody(body: WhatsAppQrDto): WhatsAppQrDto {
    return Array.isArray(body?.data?.messages) ? body.data : body;
  }

  private async checkMessageIdempotency(
    effective: WhatsAppQrDto,
    channelId: string,
    merchantId: string,
  ): Promise<boolean> {
    const messages = effective?.messages;
    if (!Array.isArray(messages) || messages.length === 0) return false;

    const messageId = messages[0]?.key?.id || messages[0]?.id;
    if (!messageId) return false;

    const key = idemKey({
      provider: 'whatsapp_qr',
      channelId,
      merchantId,
      messageId,
    });
    return await preventDuplicates(this.cacheManager, key);
  }

  private async handleAny(
    channelId: string,
    req: RequestWithWebhookData,
    body: WhatsAppQrDto,
    evt?: string,
  ): Promise<void> {
    const merchantId = String(req.merchantId);
    if (!merchantId) throw new NotFoundException('Merchant not resolved');

    const evoState = this.extractEvoState(body);
    await this.updateChannelStatus(channelId, evoState);

    const effective = this.getEffectiveBody(body);
    if (await this.checkMessageIdempotency(effective, channelId, merchantId)) {
      return;
    }

    await this.webhooksController.handleIncoming(
      merchantId,
      { provider: 'whatsapp_qr', channelId, event: evt, ...effective },
      req,
    );
  }
}
