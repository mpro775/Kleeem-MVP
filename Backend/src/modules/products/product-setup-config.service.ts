// src/modules/merchants/product-setup-config.service.ts

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ProductSetupConfig } from './schemas/product-setup-config.schema';
import { ProductSetupConfigDto } from './dto/product-setup-config.dto';

@Injectable()
export class ProductSetupConfigService {
  constructor(
    @InjectModel(ProductSetupConfig.name)
    private readonly configModel: Model<ProductSetupConfig>,
  ) {}

  async saveOrUpdate(merchantId: string, dto: ProductSetupConfigDto) {
    return this.configModel.findOneAndUpdate(
      { merchantId: merchantId },
      { ...dto, merchantId },
      { upsert: true, new: true },
    );
  }

  async getByMerchantId(merchantId: string) {
    return this.configModel.findOne({
      merchantId: merchantId,
    });
  }
}
