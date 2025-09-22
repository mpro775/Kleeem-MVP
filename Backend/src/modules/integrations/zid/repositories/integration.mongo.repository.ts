import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Integration,
  IntegrationDocument,
} from '../../schemas/integration.schema';

import {
  IntegrationEntity,
  IntegrationRepository,
} from './integration.repository';

@Injectable()
export class IntegrationMongoRepository implements IntegrationRepository {
  constructor(
    @InjectModel(Integration.name)
    private readonly model: Model<IntegrationDocument>,
  ) {}

  async findZidByMerchant(
    merchantId: Types.ObjectId | string,
  ): Promise<IntegrationEntity | null> {
    return this.model
      .findOne({
        merchantId: new Types.ObjectId(String(merchantId)),
        provider: 'zid',
      })
      .lean<IntegrationEntity>()
      .exec();
  }

  async upsertZid(
    merchantId: Types.ObjectId | string,
    patch: Partial<IntegrationEntity>,
  ): Promise<void> {
    await this.model.updateOne(
      { merchantId: new Types.ObjectId(String(merchantId)), provider: 'zid' },
      { $set: patch },
      { upsert: true },
    );
  }
}
