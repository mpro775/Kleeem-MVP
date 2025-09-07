// src/storefront/storefront.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import {
  Category,
  CategorySchema,
} from '../categories/schemas/category.schema';
import { Storefront, StorefrontSchema } from './schemas/storefront.schema';
import { VectorModule } from '../vector/vector.module';
import { MulterModule } from '@nestjs/platform-express';
import * as Minio from 'minio';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { LeadsModule } from '../leads/leads.module';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Storefront.name, schema: StorefrontSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    VectorModule,
    MulterModule.register({ dest: './uploads' }),
    LeadsModule,
  ],
  controllers: [StorefrontController],
  providers: [StorefrontService,
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
    },],
  exports: [StorefrontService],
})
export class StorefrontModule {}
