// src/integrations/salla/salla.module.ts
import { HttpModule } from '@nestjs/axios';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DEFAULT_TIMEOUT } from 'src/common/constants/common';

import { CatalogModule } from '../../catalog/catalog.module';
import {
  Merchant,
  MerchantSchema,
} from '../../merchants/schemas/merchant.schema';
import { Integration, IntegrationSchema } from '../schemas/integration.schema';

import { SallaIntegrationMongoRepository } from './repositories/integration.mongo.repository';
import { SallaMerchantMongoRepository } from './repositories/merchant.mongo.repository';
import { SallaController } from './salla.controller';
import { SallaService } from './salla.service';
import { SALLA_INTEGRATION_REPOSITORY } from './tokens';
import { SALLA_MERCHANT_REPOSITORY } from './tokens';

@Module({
  imports: [
    HttpModule.register({ timeout: DEFAULT_TIMEOUT, maxRedirects: 5 }),
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
