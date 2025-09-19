import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Integration,
  IntegrationDocument,
} from '../../schemas/integration.schema';
import {
  SallaIntegrationEntity,
  SallaIntegrationRepository,
} from './integration.repository';

@Injectable()
export class SallaIntegrationMongoRepository
  implements SallaIntegrationRepository
{
  constructor(
    @InjectModel(Integration.name)
    private readonly model: Model<IntegrationDocument>,
  ) {}

  async findByMerchant(
    merchantId: Types.ObjectId | string,
  ): Promise<SallaIntegrationEntity | null> {
    return this.model
      .findOne({
        merchantId: new Types.ObjectId(String(merchantId)),
        provider: 'salla',
      })
      .lean<SallaIntegrationEntity>()
      .exec();
  }

  async upsert(
    merchantId: Types.ObjectId | string,
    patch: Partial<SallaIntegrationEntity>,
  ): Promise<void> {
    await this.model.updateOne(
      { merchantId: new Types.ObjectId(String(merchantId)), provider: 'salla' },
      { $set: patch },
      { upsert: true },
    );
  }
}
