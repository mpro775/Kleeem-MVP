// src/modules/webhooks/whatsapp-qr.webhook.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  Channel,
  ChannelDocument,
  ChannelStatus,
} from '../channels/schemas/channel.schema';
import { WebhooksController } from './webhooks.controller'; // لإعادة استخدام المعالجة الموحّدة
import { mapEvoStatus } from '../channels/utils/evo-status.util';

// src/modules/webhooks/whatsapp-qr.webhook.controller.ts
@Public()
@Controller('webhooks/whatsapp_qr')
export class WhatsappQrWebhookController {
  constructor(
    @InjectModel(Channel.name)
    private readonly channelModel: Model<ChannelDocument>,
    private readonly config: ConfigService,
    private readonly webhooksController: WebhooksController,
  ) {}

  // يلتقط: POST /webhooks/whatsapp_qr/:channelId
  @Post(':channelId')
  async incoming(
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.handleAny(channelId, req, body, undefined);
  }

  // يلتقط: POST /webhooks/whatsapp_qr/:channelId/event  (وهذا الذي يرسله Evolution عند webhook_by_events=true)
  @Post(':channelId/event')
  async incomingEvent(
    @Param('channelId') channelId: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.handleAny(channelId, req, body, 'event');
  }

  // اختياري: يلتقط أي اسم حدث: /:channelId/:evt
  @Post(':channelId/:evt')
  async incomingAny(
    @Param('channelId') channelId: string,
    @Param('evt') evt: string,
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.handleAny(channelId, req, body, evt);
  }

  private async handleAny(
    channelId: string,
    req: any,
    body: any,
    evt?: string,
  ) {
    const got = req.headers['apikey'] || req.headers['x-evolution-apikey'];
    const expected =
      this.config.get<string>('EVOLUTION_APIKEY') ||
      this.config.get<string>('EVOLUTION_API_KEY');
    if (got && expected && got !== expected) {
      throw new ForbiddenException('Bad apikey');
    }

    const ch = await this.channelModel.findById(channelId);
    if (!ch) throw new NotFoundException('channel not found');

    // تحديث حالة القناة لو وصلتنا
    const evoState =
      body?.status ||
      body?.instance?.status ||
      body?.connection ||
      body?.event?.status;
    const mapped = mapEvoStatus(evoState);
    if (mapped) {
      ch.status = mapped;
      if (mapped === ChannelStatus.CONNECTED) ch.qr = undefined;
      await ch.save();
    }

    // Evolution كثيرًا ما يغلف الرسالة داخل body.data .. افردها لو موجودة
    const effective = Array.isArray(body?.data?.messages) ? body.data : body;

    // مرّر إلى المعالج الموحد (سيقوم normalize بتحويلها)
    return this.webhooksController.handleIncoming(
      String(ch.merchantId),
      {
        provider: 'whatsapp_qr',
        channelId,
        event: evt,
        ...effective, // ← الآن لو كانت messages داخل data ستظهر في الجذر
      },
      req,
    );
  }
}
