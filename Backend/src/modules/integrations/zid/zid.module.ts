// src/integrations/zid/zid.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { ZidController } from './zid.controller';
import { ZidService } from './zid.service';

import {
  Merchant,
  MerchantSchema,
} from '../../merchants/schemas/merchant.schema';
import { Integration, IntegrationSchema } from '../schemas/integration.schema';

import { ProductsModule } from '../../products/products.module';
import { OrdersModule } from '../../orders/orders.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 5 }),
    ConfigModule,
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Integration.name, schema: IntegrationSchema },
    ]),
    forwardRef(() => ProductsModule),
    forwardRef(() => OrdersModule),
  ],
  controllers: [ZidController],
  providers: [ZidService],
  exports: [ZidService],
})
export class ZidModule {}
