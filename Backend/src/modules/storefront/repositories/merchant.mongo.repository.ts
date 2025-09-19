import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import {
  MerchantEntity,
  StorefrontMerchantRepository,
} from './merchant.repository';

@Injectable()
export class StorefrontMerchantMongoRepository
  implements StorefrontMerchantRepository
{
  constructor(
    @InjectModel(Merchant.name)
    private readonly model: Model<MerchantDocument>,
  ) {}

  async findByIdLean(id: string): Promise<MerchantEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findById(new Types.ObjectId(id))
      .lean<MerchantEntity>()
      .exec();
  }
}
