import type { Order } from '../../orders/schemas/order.schema';
import type { Types } from 'mongoose';

export type OrderEntity = Order & { _id: Types.ObjectId; createdAt?: Date };

export interface StorefrontOrderRepository {
  findMyOrders(
    merchantId: string,
    params: { sessionId?: string; phone?: string; limit: number },
  ): Promise<OrderEntity[]>;
}
