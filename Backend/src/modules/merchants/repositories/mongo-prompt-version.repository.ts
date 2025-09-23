import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { AdvancedConfig } from '../schemas/advanced-config.schema';
import { Merchant, MerchantDocument } from '../schemas/merchant.schema';

import { PromptVersionRepository } from './prompt-version.repository';

@Injectable()
export class MongoPromptVersionRepository implements PromptVersionRepository {
  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}

  async getOrFail(merchantId: string): Promise<MerchantDocument> {
    const m = await this.merchantModel.findById(merchantId);
    if (!m) throw new NotFoundException('Merchant not found');
    return m;
  }

  async getAdvancedHistory(
    merchantId: string,
  ): Promise<{ template: string; note?: string; updatedAt: Date }[]> {
    const m = await this.merchantModel
      .findById(merchantId, 'advancedConfigHistory')
      .lean();
    if (!m) throw new NotFoundException('Merchant not found');
    return Array.isArray(
      (m as unknown as { advancedConfigHistory: AdvancedConfig[] })
        .advancedConfigHistory,
    )
      ? (m as unknown as { advancedConfigHistory: AdvancedConfig[] })
          .advancedConfigHistory
      : [];
  }

  async appendAdvancedHistory(
    merchantId: string,
    entry: { template: string; note?: string; updatedAt: Date },
  ): Promise<void> {
    await this.merchantModel.updateOne(
      { _id: merchantId },
      { $push: { advancedConfigHistory: entry } },
    );
  }

  async setCurrentAdvancedConfig(
    merchantId: string,
    data: { template: string; updatedAt: Date; note?: string },
  ): Promise<void> {
    await this.merchantModel.updateOne(
      { _id: merchantId },
      {
        $set: {
          'currentAdvancedConfig.template': data.template,
          'currentAdvancedConfig.updatedAt': data.updatedAt,
          'currentAdvancedConfig.note': data.note ?? '',
        },
      },
    );
  }
}
