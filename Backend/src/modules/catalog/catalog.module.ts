// src/modules/catalog/catalog.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';

import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';

import { ZidModule } from '../integrations/zid/zid.module';
import { SallaModule } from '../integrations/salla/salla.module';
import { ProductsModule } from '../products/products.module';
import { MongoCatalogRepository } from './repositories/mongo-catalog.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
    ]),
    forwardRef(() => ZidModule),
    forwardRef(() => SallaModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [CatalogController],
  providers: [
    CatalogService,
    {
      provide: 'CatalogRepository',
      useClass: MongoCatalogRepository,
    },
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
