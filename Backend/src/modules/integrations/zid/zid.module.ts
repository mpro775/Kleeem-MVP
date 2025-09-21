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
import { RabbitModule } from 'src/infra/rabbit/rabbit.module';
import { CatalogModule } from '../../catalog/catalog.module';
import { ZID_INTEGRATION_REPOSITORY } from './tokens';
import { IntegrationMongoRepository } from './repositories/integration.mongo.repository';
import { ZID_MERCHANT_REPOSITORY } from './tokens';
import { MerchantMongoRepository } from './repositories/merchant.mongo.repository';

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
    forwardRef(() => CatalogModule),
    RabbitModule,
  ],
  controllers: [ZidController],
  providers: [
    ZidService,
    {
      provide: ZID_INTEGRATION_REPOSITORY,
      useClass: IntegrationMongoRepository,
    },
    { provide: ZID_MERCHANT_REPOSITORY, useClass: MerchantMongoRepository },
  ],
  exports: [ZidService],
})
export class ZidModule {}
