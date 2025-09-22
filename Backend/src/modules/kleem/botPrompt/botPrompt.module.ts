import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CommonModule } from '../../../common/config/common.module';
import { VectorModule } from '../../vector/vector.module';
import { CtaService } from '../cta/cta.service';
import { IntentService } from '../intent/intent.service';
import { SettingsModule } from '../settings/settings.module';

import { BotPromptController } from './botPrompt.controller';
import { BotPromptService } from './botPrompt.service';
import { PromptSandboxController } from './prompt-sandbox.controller';
import { BotPromptMongoRepository } from './repositories/bot-prompt.mongo.repository';
import { BotPrompt, BotPromptSchema } from './schemas/botPrompt.schema';
import { BOT_PROMPT_REPOSITORY } from './tokens';

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
