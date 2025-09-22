// src/storefront/storefront.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import * as Minio from 'minio';

import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { LeadsModule } from '../leads/leads.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { VectorModule } from '../vector/vector.module';

import { StorefrontCategoryMongoRepository } from './repositories/category.mongo.repository';
import { StorefrontMerchantMongoRepository } from './repositories/merchant.mongo.repository';
import { StorefrontOrderMongoRepository } from './repositories/order.mongo.repository';
import { StorefrontProductMongoRepository } from './repositories/product.mongo.repository';
import { StorefrontMongoRepository } from './repositories/storefront.mongo.repository';
import { Storefront, StorefrontSchema } from './schemas/storefront.schema';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import {
  STOREFRONT_REPOSITORY,
  STOREFRONT_PRODUCT_REPOSITORY,
  STOREFRONT_CATEGORY_REPOSITORY,
  STOREFRONT_MERCHANT_REPOSITORY,
  STOREFRONT_ORDER_REPOSITORY,
} from './tokens';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Storefront.name, schema: StorefrontSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    forwardRef(() => VectorModule),
    MulterModule.register({ dest: './uploads' }),
    LeadsModule,
  ],
  controllers: [StorefrontController],
  providers: [
    StorefrontService,
    {
      provide: 'MINIO_CLIENT',
      useFactory: () =>
        new Minio.Client({
          endPoint: process.env.MINIO_ENDPOINT!,
          port: parseInt(process.env.MINIO_PORT ?? '9000', 10),
          useSSL: process.env.MINIO_USE_SSL === 'true',
          accessKey: process.env.MINIO_ACCESS_KEY!,
          secretKey: process.env.MINIO_SECRET_KEY!,
        }),
    },
    { provide: STOREFRONT_REPOSITORY, useClass: StorefrontMongoRepository },
    {
      provide: STOREFRONT_PRODUCT_REPOSITORY,
      useClass: StorefrontProductMongoRepository,
    },
    {
      provide: STOREFRONT_CATEGORY_REPOSITORY,
      useClass: StorefrontCategoryMongoRepository,
    },
    {
      provide: STOREFRONT_MERCHANT_REPOSITORY,
      useClass: StorefrontMerchantMongoRepository,
    },
    {
      provide: STOREFRONT_ORDER_REPOSITORY,
      useClass: StorefrontOrderMongoRepository,
    },
  ],
  exports: [StorefrontService],
})
export class StorefrontModule {}
