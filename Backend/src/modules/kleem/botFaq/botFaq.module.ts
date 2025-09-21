// src/modules/kleem/botFaq/botFaq.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotFaq, BotFaqSchema } from './schemas/botFaq.schema';
import { BotFaqService } from './botFaq.service';
import { BotFaqController, BotFaqPublicController } from './botFaq.controller';
import { VectorModule } from '../../vector/vector.module';
import { seconds, ThrottlerModule } from '@nestjs/throttler';
import { BOT_FAQ_REPOSITORY } from './tokens';
import { BotFaqMongoRepository } from './repositories/bot-faq.mongo.repository';
import { CommonModule } from '../../../common/config/common.module';

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
