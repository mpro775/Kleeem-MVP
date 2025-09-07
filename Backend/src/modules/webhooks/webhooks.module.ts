// src/modules/webhooks/webhooks.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { Webhook, WebhookSchema } from './schemas/webhook.schema';

import { MessagingModule } from '../messaging/message.module';
import { OrdersModule } from '../orders/orders.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { ChatMediaModule } from '../media/chat-media.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ChatModule } from '../chat/chat.module';
import { OutboxModule } from 'src/common/outbox/outbox.module';
import { ChannelsModule } from '../channels/channels.module';
import { TelegramWebhookController } from './telegram.webhook.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { Channel, ChannelSchema } from '../channels/schemas/channel.schema';
import { WhatsappQrWebhookController } from './whatsapp-qr.webhook.controller';
import { ChatWebhooksUnifiedController } from './chat-webhooks-unified.controller';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [
    // فقط موديل Webhook لتخزين الأحداث الواردة
    MongooseModule.forFeature([{ name: Webhook.name, schema: WebhookSchema }]),
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
    OrdersModule,
    ChatMediaModule,
    IntegrationsModule,
    OutboxModule,
    ChatModule,
    // وحدات الاعتمادية
    NotificationsModule,
    MessagingModule, // لحفظ الرسائل (MessageService)
    ChannelsModule,
    MerchantsModule, // للوصول إلى SlugResolverService
  ],
  providers: [
    WebhooksService, // خدمة معالجة الـ webhook العامة
    WebhooksController, // لإعادة استخدامه في TelegramWebhookController
  ],
  controllers: [
    WebhooksController,
    TelegramWebhookController,
    WhatsappQrWebhookController,
    ChatWebhooksUnifiedController,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
