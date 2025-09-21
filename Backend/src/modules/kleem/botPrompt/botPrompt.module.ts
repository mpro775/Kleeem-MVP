import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotPrompt, BotPromptSchema } from './schemas/botPrompt.schema';
import { BotPromptService } from './botPrompt.service';
import { BotPromptController } from './botPrompt.controller';
import { PromptSandboxController } from './prompt-sandbox.controller';
import { SettingsModule } from '../settings/settings.module';
import { VectorModule } from '../../vector/vector.module';
import { IntentService } from '../intent/intent.service';
import { CtaService } from '../cta/cta.service';
import { BOT_PROMPT_REPOSITORY } from './tokens';
import { BotPromptMongoRepository } from './repositories/bot-prompt.mongo.repository';
import { CommonModule } from '../../../common/config/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BotPrompt.name, schema: BotPromptSchema },
    ]),
    SettingsModule, // لاستخدام إعدادات المحادثة
    VectorModule, // للـ Knowledge (FAQs)
    CommonModule, // للوصول إلى TranslationService
  ],
  providers: [
    BotPromptService,
    IntentService,
    CtaService,
    {
      provide: BOT_PROMPT_REPOSITORY,
      useClass: BotPromptMongoRepository,
    },
  ],
  controllers: [BotPromptController, PromptSandboxController],
  exports: [BotPromptService, IntentService, CtaService],
})
export class BotPromptModule {}
