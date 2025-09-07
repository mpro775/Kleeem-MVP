// src/modules/webhooks/telegram.webhook.controller.ts
import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Channel, ChannelDocument } from '../channels/schemas/channel.schema';
import { ConfigService } from '@nestjs/config';
import { WebhooksController } from './webhooks.controller'; // لإعادة استخدام handleIncoming

@Public()
@Controller('webhooks/telegram')
export class TelegramWebhookController {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    private readonly config: ConfigService,
    private readonly webhooksController: WebhooksController,
  ) {}

  @Post(':channelId')
  async incoming(
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    const tokenHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (
      !tokenHeader ||
      tokenHeader !== this.config.get('TELEGRAM_WEBHOOK_SECRET')
    ) {
      throw new ForbiddenException('Bad secret token');
    }
    const ch = await this.channelModel.findById(channelId).lean();
    if (!ch?.merchantId) throw new ForbiddenException('Channel not found');

    // أعد استخدام نقطة المعالجة الموحدة (نفس اللي تستقبل تيليجرام/واتساب/ويب شات):
    return this.webhooksController.handleIncoming(String(ch.merchantId), body, req);
  }
}
