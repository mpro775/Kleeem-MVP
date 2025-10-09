// src/modules/webhooks/webhooks.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WebhookSignatureGuard } from 'src/common/guards/webhook-signature.guard';
import { OutboxModule } from 'src/common/outbox/outbox.module';

import { CommonModule } from '../../common/config/common.module';
import { ChannelsModule } from '../channels/channels.module';
import { Channel, ChannelSchema } from '../channels/schemas/channel.schema';
import { ChatModule } from '../chat/chat.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ChatMediaModule } from '../media/chat-media.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { MessagingModule } from '../messaging/message.module';
import { N8nWorkflowModule } from '../n8n-workflow/n8n-workflow.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrdersModule } from '../orders/orders.module';

import { ChatWebhooksUnifiedController } from './chat-webhooks-unified.controller';
import { ChannelMongoRepository } from './repositories/channel.mongo.repository';
import { WebhookMongoRepository } from './repositories/webhook.mongo.repository';
import { Webhook, WebhookSchema } from './schemas/webhook.schema';
import { TelegramWebhookController } from './telegram.webhook.controller';
import { WEBHOOK_REPOSITORY } from './tokens';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WhatsAppCloudWebhookController } from './whatsapp-cloud.webhook.controller';
import { WhatsappQrWebhookController } from './whatsapp-qr.webhook.controller';

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
    N8nWorkflowModule,
    ChatModule,
    // وحدات الاعتمادية
    NotificationsModule,
    MessagingModule, // لحفظ الرسائل (MessageService)
    ChannelsModule,
    MerchantsModule, // للوصول إلى SlugResolverService
    CommonModule, // للوصول إلى TranslationService
  ],
  providers: [
    WebhooksService, // خدمة معالجة الـ webhook العامة
    WebhooksController, // لإعادة استخدامه في TelegramWebhookController
    { provide: WEBHOOK_REPOSITORY, useClass: WebhookMongoRepository },
    WebhookSignatureGuard,
    { provide: 'ChannelRepository', useClass: ChannelMongoRepository },
  ],
  controllers: [
    WebhooksController,
    TelegramWebhookController,
    WhatsappQrWebhookController,
    ChatWebhooksUnifiedController,
    WhatsAppCloudWebhookController,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
