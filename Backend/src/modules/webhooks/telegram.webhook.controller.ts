// src/modules/webhooks/telegram.webhook.controller.ts
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  Inject,
  UseGuards,
  UsePipes,
  ValidationPipe,
  NotFoundException,
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
import { Channel, ChannelDocument } from '../channels/schemas/channel.schema';

import { TelegramUpdateDto } from './dto/telegram-update.dto';
import { WebhookLoggingInterceptor } from './interceptors/webhook-logging.interceptor';
import { WebhooksController } from './webhooks.controller';

interface RequestWithWebhookData extends RequestWithUser {
  merchantId: string;
  channel: ChannelSecretsLean;
}
@Public()
@UseInterceptors(WebhookLoggingInterceptor)
@Controller('webhooks/telegram')
export class TelegramWebhookController {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    private readonly webhooksController: WebhooksController,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post(':channelId')
  @Throttle({
    default: {
      ttl: parseInt(process.env.WEBHOOKS_INCOMING_TTL || '10'),
      limit: parseInt(process.env.WEBHOOKS_INCOMING_LIMIT || '1'),
    },
  })
  @UseGuards(WebhookSignatureGuard)
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
    @Body() body: TelegramUpdateDto,
  ): Promise<void> {
    // ✅ تم التحقق بواسطة الحارس — معنا الآن:
    // req.merchantId, req.channel
    const merchantId = String(req.merchantId); // TODO: check if this is correct
    if (!merchantId) throw new NotFoundException('Merchant not resolved');

    const updateId = body?.update_id;
    if (updateId !== undefined && updateId !== null) {
      const key = idemKey({
        provider: 'telegram',
        channelId,
        merchantId,
        messageId: updateId,
      });
      if (await preventDuplicates(this.cacheManager, key)) {
        return;
      }
    }

    await this.webhooksController.handleIncoming(merchantId, body, req);
  }
}
