// src/modules/webhooks/telegram.webhook.controller.ts
import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Public } from 'src/common/decorators/public.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from '../channels/schemas/channel.schema';
import { ConfigService } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller'; // لإعادة استخدام handleIncoming
import { timingSafeEqual } from 'crypto';

@Public()
@Controller('webhooks/telegram')
export class TelegramWebhookController {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    private readonly config: ConfigService,
    private readonly webhooksController: WebhooksController,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  @Post(':channelId')
  async incoming(
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    // ✅ B2: تحقق من secret token مع timing-safe comparison
    const tokenHeader = req.headers['x-telegram-bot-api-secret-token'];
    const expectedToken = this.config.get('TELEGRAM_WEBHOOK_SECRET');

    if (!tokenHeader || !expectedToken) {
      throw new ForbiddenException('Bad secret token');
    }

    // استخدام timing-safe comparison لمنع timing attacks
    const tokenBuffer = Buffer.from(tokenHeader);
    const expectedBuffer = Buffer.from(expectedToken);

    if (
      tokenBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(tokenBuffer, expectedBuffer)
    ) {
      throw new ForbiddenException('Bad secret token');
    }

    const ch = await this.channelModel.findById(channelId).lean();
    if (!ch?.merchantId) throw new ForbiddenException('Channel not found');

    // ✅ B2: Idempotency عبر update_id
    const updateId = body?.update_id;
    if (updateId) {
      const idempotencyKey = `idem:webhook:telegram:${updateId}`;
      const existing = await this.cacheManager.get(idempotencyKey);

      if (existing) {
        // إرجاع نفس الاستجابة المخزنة مسبقاً
        return { status: 'duplicate_ignored', updateId };
      }

      // تخزين في الكاش لمدة 24 ساعة
      await this.cacheManager.set(idempotencyKey, true, 24 * 60 * 60 * 1000);
    }

    // أعد استخدام نقطة المعالجة الموحدة (نفس اللي تستقبل تيليجرام/واتساب/ويب شات):
    return this.webhooksController.handleIncoming(
      String(ch.merchantId),
      body,
      req,
    );
  }
}
