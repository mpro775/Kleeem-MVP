// src/integrations/salla/salla.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { SallaController } from './salla.controller';
import { SallaService } from './salla.service';

import {
  Merchant,
  MerchantSchema,
} from '../../merchants/schemas/merchant.schema';
import { Integration, IntegrationSchema } from '../schemas/integration.schema';
import { CatalogModule } from '../../catalog/catalog.module';
import { SALLA_INTEGRATION_REPOSITORY } from './tokens';
import { SallaIntegrationMongoRepository } from './repositories/integration.mongo.repository';
import { SALLA_MERCHANT_REPOSITORY } from './tokens';
import { SallaMerchantMongoRepository } from './repositories/merchant.mongo.repository';

@Module({
  imports: [
    HttpModule.register({ timeout: 10000, maxRedirects: 5 }),
    ConfigModule,
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Integration.name, schema: IntegrationSchema },
    ]),
    forwardRef(() => CatalogModule),
  ],
  controllers: [SallaController],
  providers: [
    SallaService,
    {
      provide: SALLA_INTEGRATION_REPOSITORY,
      useClass: SallaIntegrationMongoRepository,
    },
    {
      provide: SALLA_MERCHANT_REPOSITORY,
      useClass: SallaMerchantMongoRepository,
    },
  ],
  exports: [SallaService],
})
export class SallaModule {}
