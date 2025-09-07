// src/analytics/analytics.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  MessageSession,
  MessageSessionSchema,
} from '../messaging/schemas/message.schema';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { ProductsModule } from '../products/products.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import {
  MissingResponse,
  MissingResponseSchema,
} from './schemas/missing-response.schema';
import {
  KleemMissingResponse,
  KleemMissingResponseSchema,
} from './schemas/kleem-missing-response.schema';
import { AnalyticsAdminController } from './analytics.admin.controller';
import { FaqModule } from '../faq/faq.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { Channel, ChannelSchema } from '../channels/schemas/channel.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageSession.name, schema: MessageSessionSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
      { name: MissingResponse.name, schema: MissingResponseSchema },
      { name: KleemMissingResponse.name, schema: KleemMissingResponseSchema },
      { name: Merchant.name, schema: MerchantSchema },
      { name: Channel.name, schema: ChannelSchema },
    ]),
    forwardRef(() => ProductsModule),
    FaqModule,
    NotificationsModule,  // ← أضف هذا السطر    

  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController, AnalyticsAdminController],
  exports: [AnalyticsService], // ← هذا السطر مفقود عندك
})
export class AnalyticsModule {}
