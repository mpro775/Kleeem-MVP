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

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Storefront.name, schema: StorefrontSchema },
    ]),
  ],
  controllers: [StorefrontController],
  providers: [StorefrontService],
  exports: [StorefrontService],
})
export class StorefrontModule {}
