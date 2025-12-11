// src/modules/promotions/promotions.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';

import { PromotionsController } from './promotions.controller';
import { PromotionsCron } from './promotions.cron';
import { PromotionsService } from './promotions.service';
import { MongoPromotionsRepository } from './repositories/mongo-promotions.repository';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';

@Module({
  imports: [
    // ملاحظة: ScheduleModule.forRoot() موجود أيضاً في AppModule، والإضافة هنا لن تضر
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
    ]),
  ],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    PromotionsCron,
    {
      provide: 'PromotionsRepository',
      useClass: MongoPromotionsRepository,
    },
  ],
  exports: [PromotionsService],
})
export class PromotionsModule {}
