// src/modules/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { LeadsModule } from '../leads/leads.module';
import { ZidModule } from '../integrations/zid/zid.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { forwardRef } from '@nestjs/common';
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    LeadsModule,
    forwardRef(() => ZidModule),
  ],
  providers: [OrdersService],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
