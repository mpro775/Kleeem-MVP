import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

import { OffersService } from './offers.service';
import { MerchantMongoRepository } from './repositories/merchant.mongo.repository';
import { ProductMongoRepository } from './repositories/product.mongo.repository';
import { PRODUCT_REPOSITORY, MERCHANT_REPOSITORY } from './tokens';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Merchant.name, schema: MerchantSchema },
    ]),
  ],
  providers: [
    OffersService,
    { provide: PRODUCT_REPOSITORY, useClass: ProductMongoRepository },
    { provide: MERCHANT_REPOSITORY, useClass: MerchantMongoRepository },
  ],
  exports: [OffersService],
})
export class OffersModule {}
