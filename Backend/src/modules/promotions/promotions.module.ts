// src/modules/promotions/promotions.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { MongoPromotionsRepository } from './repositories/mongo-promotions.repository';
import { Promotion, PromotionSchema } from './schemas/promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Promotion.name, schema: PromotionSchema },
    ]),
  ],
  controllers: [PromotionsController],
  providers: [
    PromotionsService,
    {
      provide: 'PromotionsRepository',
      useClass: MongoPromotionsRepository,
    },
  ],
  exports: [PromotionsService],
})
export class PromotionsModule {}
