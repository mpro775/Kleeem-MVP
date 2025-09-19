import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OffersService } from './offers.service';

import { PRODUCT_REPOSITORY, MERCHANT_REPOSITORY } from './tokens';
import { ProductMongoRepository } from './repositories/product.mongo.repository';
import { MerchantMongoRepository } from './repositories/merchant.mongo.repository';

import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';

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
