import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { MerchantRepository } from './merchant.repository';

@Injectable()
export class MerchantMongoRepository implements MerchantRepository {
  constructor(
    @InjectModel(Merchant.name)
    private readonly model: Model<MerchantDocument>,
  ) {}

  async getPublicSlug(merchantId: string): Promise<string | undefined> {
    const doc = await this.model
      .findById(new Types.ObjectId(merchantId))
      .select('publicSlug')
      .lean<{ publicSlug?: string }>()
      .exec();

    return doc?.publicSlug || undefined;
  }
}
