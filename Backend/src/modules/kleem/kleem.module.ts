// kleem.module.ts
import { Module } from '@nestjs/common';
import { KleemChatService } from './chat/kleem-chat.service';
import { KleemChatController } from './chat/kleem-chat.controller';              // ← أضِف هذا
import { KleemWebhookController } from './webhook/kleem-webhook.controller';    // ← وأيضًا هذا
import { KleemGateway } from './ws/kleem.gateway';                               // ← والـ Gateway

import { BotChatsModule } from './botChats/botChats.module';
import { BotPromptModule } from './botPrompt/botPrompt.module';
import { SettingsModule } from './settings/settings.module';
import { VectorModule } from '../vector/vector.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BotFaqModule } from './botFaq/botFaq.module';

@Module({
  imports: [
    BotChatsModule,
    BotPromptModule,
    BotFaqModule,
    SettingsModule,
    VectorModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [KleemChatController, KleemWebhookController],  // ← مهم
  providers: [KleemChatService, KleemGateway],                 // ← أضف الـ Gateway هنا
  exports: [KleemChatService],
})
export class KleemModule {}
