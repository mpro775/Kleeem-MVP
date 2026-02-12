// src/modules/products/repositories/back-in-stock-request.mongo.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type FilterQuery } from 'mongoose';

import {
  BackInStockRequest,
  BackInStockRequestDocument,
  BackInStockStatus,
} from '../schemas/back-in-stock-request.schema';

import { BackInStockRequestRepository } from './back-in-stock-request.repository';

@Injectable()
export class BackInStockRequestMongoRepository
  implements BackInStockRequestRepository
{
  constructor(
    @InjectModel(BackInStockRequest.name)
    private readonly model: Model<BackInStockRequestDocument>,
  ) {}

  async create(
    request: Partial<BackInStockRequest>,
  ): Promise<BackInStockRequest> {
    const created = await this.model.create(request);
    return created.toObject();
  }

  async findById(id: string): Promise<BackInStockRequest | null> {
    return this.model.findById(id).exec();
  }

  async findByIdAndMerchant(
    id: string,
    merchantId: string,
  ): Promise<BackInStockRequest | null> {
    return this.model.findOne({ _id: id, merchantId }).exec();
  }

  async findByProductAndContact(
    merchantId: string,
    productId: string,
    variantId?: string,
    contact?: string,
    customerId?: string,
  ): Promise<BackInStockRequest | null> {
    const query: FilterQuery<BackInStockRequestDocument> = {
      merchantId,
      productId,
      status: BackInStockStatus.PENDING,
    };

    if (variantId) {
      query.variantId = variantId;
    }

    if (contact) {
      query.contact = contact;
    }

    if (customerId) {
      query.customerId = customerId;
    }

    return this.model.findOne(query).exec();
  }

  async findByCustomerOrContact(
    merchantId: string,
    customerId?: string,
    contact?: string,
  ): Promise<BackInStockRequest[]> {
    const query: FilterQuery<BackInStockRequestDocument> = { merchantId };

    if (customerId) {
      query.customerId = customerId;
    }

    if (contact) {
      query.contact = contact;
    }

    return this.model.find(query).sort({ createdAt: -1 }).exec();
  }

  async findPendingByProduct(
    merchantId: string,
    productId: string,
    variantId?: string,
  ): Promise<BackInStockRequest[]> {
    const query: FilterQuery<BackInStockRequestDocument> = {
      merchantId,
      productId,
      status: BackInStockStatus.PENDING,
    };

    if (variantId) {
      query.variantId = variantId;
    }

    return this.model.find(query).exec();
  }

  async updateStatus(id: string, status: string): Promise<boolean> {
    const result = await this.model.findByIdAndUpdate(id, { status }).exec();
    return !!result;
  }

  async updateStatusAndNotifiedAt(
    id: string,
    status: string,
    notifiedAt: Date,
  ): Promise<boolean> {
    const result = await this.model
      .findByIdAndUpdate(id, {
        status,
        notifiedAt,
      })
      .exec();
    return !!result;
  }

  async deleteOldRequests(cutoffDate: Date): Promise<number> {
    const result = await this.model
      .deleteMany({
        createdAt: { $lt: cutoffDate },
        status: {
          $in: [BackInStockStatus.NOTIFIED, BackInStockStatus.CANCELLED],
        },
      })
      .exec();
    return result.deletedCount;
  }
}
