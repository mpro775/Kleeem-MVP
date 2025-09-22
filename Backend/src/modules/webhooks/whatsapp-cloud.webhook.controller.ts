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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Cache } from 'cache-manager';
import { Public } from 'src/common/decorators/public.decorator';
import { WebhookSignatureGuard } from 'src/common/guards/webhook-signature.guard';
import { preventDuplicates, idemKey } from 'src/common/utils/idempotency.util';

import { WhatsAppCloudDto } from './dto/whatsapp-cloud.dto';
import { WebhooksController } from './webhooks.controller';

@Public() // يوقف JWT فقط؛ الـ Guard سيتكفل بالتحقق
@Controller('webhooks/whatsapp_cloud')
export class WhatsAppCloudWebhookController {
  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly webhooksController: WebhooksController,
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
  @HttpCode(200)
  async incoming(
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body() body: WhatsAppCloudDto,
  ) {
    const merchantId = String(req.merchantId); // تم تعيينها من الـ Guard
    if (!merchantId) throw new ForbiddenException('Merchant not resolved');

    // Idempotency
    const v = body?.entry?.[0]?.changes?.[0]?.value;
    const msgId =
      v?.messages?.[0]?.id ||
      v?.statuses?.[0]?.id ||
      v?.messages?.[0]?.timestamp || // fallback ضعيف
      body?.object; // آخر حل ضعيف

    if (msgId) {
      const key = idemKey({
        provider: 'wa_cloud',
        channelId,
        merchantId,
        messageId: msgId,
      });
      if (await preventDuplicates(this.cache, key)) {
        return { status: 'duplicate_ignored', messageId: msgId };
      }
    }

    // مرّر للمعالجة الموحدة لديك
    return this.webhooksController.handleIncoming(merchantId, body, req);
  }
}
