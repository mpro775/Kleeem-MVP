import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';

import { Order, OrderDocument } from '../../orders/schemas/order.schema';

import { OrderEntity, StorefrontOrderRepository } from './order.repository';

@Injectable()
export class StorefrontOrderMongoRepository
  implements StorefrontOrderRepository
{
  constructor(
    @InjectModel(Order.name)
    private readonly model: Model<OrderDocument>,
  ) {}

  async findMyOrders(
    merchantId: string,
    params: { sessionId?: string; phone?: string; limit: number },
  ): Promise<OrderEntity[]> {
    const filter: FilterQuery<OrderDocument> = {
      merchantId,
      $or: [] as Record<string, unknown>[],
    };
    if (params.sessionId)
      (filter.$or as Record<string, unknown>[]).push({
        sessionId: params.sessionId,
      });
    if (params.phone)
      (filter.$or as Record<string, unknown>[]).push({
        'customer.phone': params.phone,
      });

    if ((filter.$or as Record<string, unknown>[]).length === 0) return [];

    return this.model
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(params.limit, 200))
      .lean<OrderEntity[]>()
      .exec();
  }
}
