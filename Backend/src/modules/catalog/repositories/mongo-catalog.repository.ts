import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { CatalogRepository } from './catalog.repository';

@Injectable()
export class MongoCatalogRepository implements CatalogRepository {
  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}

  async findMerchantLean(merchantId: string | Types.ObjectId) {
    const _id =
      typeof merchantId === 'string'
        ? new Types.ObjectId(merchantId)
        : merchantId;
    return this.merchantModel.findById(_id).select(['productSource']).lean<{
      _id: Types.ObjectId;
      productSource?: 'internal' | 'salla' | 'zid';
    }>();
  }
}
