import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Body,
  Controller,
  Post,
  Param,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpCode,
  Inject,
  ForbiddenException,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Cache } from 'cache-manager';
import { Public } from 'src/common/decorators/public.decorator';
import { WebhookSignatureGuard } from 'src/common/guards/webhook-signature.guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
import { preventDuplicates, idemKey } from 'src/common/utils/idempotency.util';

import { ChannelSecretsLean } from '../channels/repositories/channels.repository';

import { WhatsAppCloudDto } from './dto/whatsapp-cloud.dto';
import { WebhookLoggingInterceptor } from './interceptors/webhook-logging.interceptor';
import { WebhooksController } from './webhooks.controller';
interface RequestWithWebhookData extends RequestWithUser {
  merchantId: string;
  channel: ChannelSecretsLean;
}
@Public() // يوقف JWT فقط؛ الـ Guard سيتكفل بالتحقق
@UseInterceptors(WebhookLoggingInterceptor)
@Controller('webhooks/whatsapp_cloud')
export class WhatsAppCloudWebhookController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly webhooksController: WebhooksController,
  ) {}
  private extractMessageId(body: WhatsAppCloudDto): string | undefined {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    const extractors = [
      () => value?.messages?.[0]?.id,
      () => value?.statuses?.[0]?.id,
      () => value?.messages?.[0]?.timestamp,
      () => body?.object,
    ];

    for (const extractor of extractors) {
      const result = extractor();
      if (result) return result;
    }
    return undefined;
  }
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
  private async checkIdempotency(
    channelId: string,
    merchantId: string,
    msgId: string | undefined,
  ): Promise<boolean> {
    if (!msgId) return false;

    const key = idemKey({
      provider: 'wa_cloud',
      channelId,
      merchantId,
      messageId: msgId,
    });
    return await preventDuplicates(this.cache, key);
  }

  @HttpCode(200)
  async incoming(
    @Param('channelId') channelId: string,
    @Req() req: RequestWithWebhookData,
    @Body() body: WhatsAppCloudDto,
  ): Promise<void> {
    const merchantId = String(req.merchantId);
    if (!merchantId) throw new ForbiddenException('Merchant not resolved');

    const msgId = this.extractMessageId(body);
    if (await this.checkIdempotency(channelId, merchantId, msgId)) {
      return;
    }

    await this.webhooksController.handleIncoming(merchantId, body, req);
  }
}
