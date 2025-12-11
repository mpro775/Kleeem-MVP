import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { CommonModule } from '../../common/config/common.module';
import { PaginationService } from '../../common/services/pagination.service';
import { CouponsModule } from '../coupons/coupons.module';
import { ZidModule } from '../integrations/zid/zid.module';
import { LeadsModule } from '../leads/leads.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { MerchantsModule } from '../merchants/merchants.module';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { PromotionsModule } from '../promotions/promotions.module';
import { ProductsModule } from '../products/products.module';

import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { MongoOrdersRepository } from './repositories/mongo-orders.repository';
import { Order, OrderSchema } from './schemas/order.schema';
import { PricingService } from './services/pricing.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    LeadsModule,
    forwardRef(() => ZidModule),
    forwardRef(() => CouponsModule),
    forwardRef(() => PromotionsModule),
    forwardRef(() => MerchantsModule),
    forwardRef(() => ProductsModule),
    CommonModule, // للوصول إلى TranslationService
  ],
  providers: [
    OrdersService,
    PricingService,
    PaginationService,
    {
      provide: 'OrdersRepository',
      useClass: MongoOrdersRepository,
    },
  ],
  controllers: [OrdersController],
  exports: [OrdersService, PricingService],
})
export class OrdersModule {}
