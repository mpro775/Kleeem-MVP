import { Types } from 'mongoose';
import { Order } from '../../orders/schemas/order.schema';

export type OrderEntity = Order & { _id: Types.ObjectId; createdAt?: Date };

export interface StorefrontOrderRepository {
  findMyOrders(
    merchantId: string,
    params: { sessionId?: string; phone?: string; limit: number },
  ): Promise<OrderEntity[]>;
}
