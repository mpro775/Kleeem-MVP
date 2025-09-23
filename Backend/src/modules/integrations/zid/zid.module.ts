// src/integrations/zid/zid.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DEFAULT_TIMEOUT } from 'src/common/constants/common';
import { RabbitModule } from 'src/infra/rabbit/rabbit.module';

import { CatalogModule } from '../../catalog/catalog.module';
import {
  Merchant,
  MerchantSchema,
} from '../../merchants/schemas/merchant.schema';
import { OrdersModule } from '../../orders/orders.module';
import { ProductsModule } from '../../products/products.module';
import { Integration, IntegrationSchema } from '../schemas/integration.schema';

import { IntegrationMongoRepository } from './repositories/integration.mongo.repository';
import { MerchantMongoRepository } from './repositories/merchant.mongo.repository';
import { ZID_INTEGRATION_REPOSITORY } from './tokens';
import { ZID_MERCHANT_REPOSITORY } from './tokens';
import { ZidController } from './zid.controller';
import { ZidService } from './zid.service';

@Module({
  imports: [
    HttpModule.register({ timeout: DEFAULT_TIMEOUT, maxRedirects: 5 }),
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
