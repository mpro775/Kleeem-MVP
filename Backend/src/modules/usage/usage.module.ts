// src/modules/usage/usage.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MerchantsModule } from 'src/modules/merchants/merchants.module';
import {
  Merchant,
  MerchantSchema,
} from 'src/modules/merchants/schemas/merchant.schema';
import { PlansModule } from 'src/modules/plans/plans.module';

import {
  UsageCounter,
  UsageCounterSchema,
} from './schemas/usage-counter.schema';
import { UsageLimitResolver } from './usage-limit.resolver';
import { UsageAdminController } from './usage.admin.controller';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageCounter.name, schema: UsageCounterSchema },
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    PlansModule,
    forwardRef(() => MerchantsModule),
  ],
  controllers: [UsageController, UsageAdminController],
  providers: [UsageService, UsageLimitResolver],
  exports: [UsageService],
})
export class UsageModule {}
