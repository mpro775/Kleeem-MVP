import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { LeadsModule } from '../leads/leads.module';
import { ZidModule } from '../integrations/zid/zid.module';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { PaginationService } from '../../common/services/pagination.service';
import { MongoOrdersRepository } from './repositories/mongo-orders.repository';
import { CommonModule } from '../../common/config/common.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Merchant.name, schema: MerchantSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    LeadsModule,
    forwardRef(() => ZidModule),
    CommonModule, // للوصول إلى TranslationService
  ],
  providers: [
    OrdersService,
    PaginationService,
    {
      provide: 'OrdersRepository',
      useClass: MongoOrdersRepository,
    },
  ],
  controllers: [OrdersController],
  exports: [OrdersService],
})
export class OrdersModule {}
