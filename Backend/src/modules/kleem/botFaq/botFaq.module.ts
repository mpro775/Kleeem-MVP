// src/modules/kleem/botFaq/botFaq.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { seconds, ThrottlerModule } from '@nestjs/throttler';

import { CommonModule } from '../../../common/config/common.module';
import { VectorModule } from '../../vector/vector.module';

import { BotFaqController, BotFaqPublicController } from './botFaq.controller';
import { BotFaqService } from './botFaq.service';
import { BotFaqMongoRepository } from './repositories/bot-faq.mongo.repository';
import { BotFaq, BotFaqSchema } from './schemas/botFaq.schema';
import { BOT_FAQ_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BotFaq.name, schema: BotFaqSchema }]),
    VectorModule,
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'public', limit: 30, ttl: seconds(60) }, // 30 طلب/دقيقة
      ],
    }),
    CommonModule, // للوصول إلى TranslationService
  ],
  providers: [
    BotFaqService,
    { provide: BOT_FAQ_REPOSITORY, useClass: BotFaqMongoRepository },
  ],
  controllers: [BotFaqController, BotFaqPublicController],
  exports: [BotFaqService],
})
export class BotFaqModule {}
