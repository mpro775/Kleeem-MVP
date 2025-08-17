import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotPrompt, BotPromptSchema } from './schemas/botPrompt.schema';
import { BotPromptService } from './botPrompt.service';
import { BotPromptController } from './botPrompt.controller';
import { PromptSandboxController } from './prompt-sandbox.controller';
import { SettingsModule } from '../settings/settings.module';
import { VectorModule } from 'src/modules/vector/vector.module';
import { IntentService } from '../intent/intent.service';
import { CtaService } from '../cta/cta.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotPrompt.name, schema: BotPromptSchema },
    ]),
    SettingsModule, // لاستخدام إعدادات المحادثة
    VectorModule, // للـ Knowledge (FAQs)
  ],
  providers: [BotPromptService, IntentService, CtaService],
  controllers: [BotPromptController, PromptSandboxController],
  exports: [BotPromptService, IntentService, CtaService],
})
export class BotPromptModule {}
