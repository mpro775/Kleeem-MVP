import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Merchant,
  MerchantDocument,
} from '../../../merchants/schemas/merchant.schema';

import { SallaMerchantRepository } from './merchant.repository';

@Injectable()
export class SallaMerchantMongoRepository implements SallaMerchantRepository {
  constructor(
    @InjectModel(Merchant.name)
    private readonly model: Model<MerchantDocument>,
  ) {}

  async updateProductSourceSalla(
    merchantId: Types.ObjectId | string,
    data?: { lastSync?: Date },
  ): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(String(merchantId)) },
      {
        $set: {
          productSource: 'salla',
          'productSourceConfig.internal.enabled': false,
          'productSourceConfig.salla.active': true,
          'productSourceConfig.salla.lastSync': data?.lastSync ?? new Date(),
        },
      },
    );
  }
}
