// src/modules/coupons/coupons.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';
import { MongoCouponsRepository } from './repositories/mongo-coupons.repository';
import { Coupon, CouponSchema } from './schemas/coupon.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Coupon.name, schema: CouponSchema }]),
  ],
  controllers: [CouponsController],
  providers: [
    CouponsService,
    {
      provide: 'CouponsRepository',
      useClass: MongoCouponsRepository,
    },
  ],
  exports: [CouponsService],
})
export class CouponsModule {}
