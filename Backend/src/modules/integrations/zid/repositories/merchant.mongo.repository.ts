import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../../../merchants/schemas/merchant.schema';
import { MerchantRepository } from './merchant.repository';

@Injectable()
export class MerchantMongoRepository implements MerchantRepository {
  constructor(
    @InjectModel(Merchant.name)
    private readonly model: Model<MerchantDocument>,
  ) {}

  async updateProductSourceZid(
    merchantId: Types.ObjectId | string,
    data: { storeId: string; lastSync?: Date },
  ): Promise<void> {
    await this.model.updateOne(
      { _id: new Types.ObjectId(String(merchantId)) },
      {
        $set: {
          productSource: 'zid',
          'productSourceConfig.internal.enabled': false,
          'productSourceConfig.zid.active': true,
          'productSourceConfig.zid.storeId': data.storeId,
          'productSourceConfig.zid.lastSync': data.lastSync ?? new Date(),
        },
      },
    );
  }
}
