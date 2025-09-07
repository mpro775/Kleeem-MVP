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
  providers: [SallaService],
  exports: [SallaService],
})
export class SallaModule {}
