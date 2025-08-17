// src/modules/kleem/botFaq/botFaq.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BotFaq, BotFaqSchema } from './schemas/botFaq.schema';
import { BotFaqService } from './botFaq.service';
import { BotFaqController, BotFaqPublicController } from './botFaq.controller';
import { VectorModule } from 'src/modules/vector/vector.module';
import { seconds, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BotFaq.name, schema: BotFaqSchema }]),
    VectorModule,
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'public', limit: 30, ttl: seconds(60) }, // 30 طلب/دقيقة
      ],
    }),
  ],
  providers: [BotFaqService],
  controllers: [BotFaqController, BotFaqPublicController],
  exports: [BotFaqService],
})
export class BotFaqModule {}
