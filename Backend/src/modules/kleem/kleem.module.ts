// kleem.module.ts
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { MetricsModule } from '../../metrics/metrics.module';
import { VectorModule } from '../vector/vector.module';

import { BotChatsModule } from './botChats/botChats.module';
import { BotFaqModule } from './botFaq/botFaq.module';
import { BotPromptModule } from './botPrompt/botPrompt.module';
import { KleemChatController } from './chat/kleem-chat.controller'; // ← أضِف هذا
import { KleemChatService } from './chat/kleem-chat.service';
import { SettingsModule } from './settings/settings.module';
import { KleemWebhookController } from './webhook/kleem-webhook.controller'; // ← وأيضًا هذا
import { KleemGateway } from './ws/kleem.gateway'; // ← والـ Gateway

@Module({
  imports: [
    BotChatsModule,
    BotPromptModule,
    BotFaqModule,
    SettingsModule,
    VectorModule,
    EventEmitterModule.forRoot(),
    MetricsModule,
  ],
  controllers: [KleemChatController, KleemWebhookController], // ← مهم
  providers: [KleemChatService, KleemGateway], // ← أضف الـ Gateway هنا
  exports: [KleemChatService],
})
export class KleemModule {}
