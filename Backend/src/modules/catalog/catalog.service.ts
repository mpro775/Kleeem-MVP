// src/catalog/catalog.service.ts (مبسط)
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Merchant,
  MerchantDocument,
} from '../merchants/schemas/merchant.schema';
import { ZidService } from '../integrations/zid/zid.service';
import { SallaService } from '../integrations/salla/salla.service';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Merchant.name) private merchantModel: Model<MerchantDocument>,
    private readonly zid: ZidService,
    private readonly salla: SallaService,
    private readonly products: ProductsService,
  ) {}

  async syncForMerchant(merchantId: string) {
    const m = await this.merchantModel.findById(merchantId).lean();
    if (!m) throw new NotFoundException('Merchant not found');

    let imported = 0,
      updated = 0;

    if (m.productSource === 'zid') {
      const list = await this.zid.fetchZidProducts(
        new Types.ObjectId(merchantId),
      );
      for (const p of list) {
        const result = await this.products.upsertExternalProduct(
          merchantId,
          'zid',
          p,
        );
        if (result.created) imported++;
        else updated++;
      }
    } else if (m.productSource === 'salla') {
      const list = await this.salla.fetchSallaProducts(
        new Types.ObjectId(merchantId),
      );
      for (const p of list) {
        const result = await this.products.upsertExternalProduct(
          merchantId,
          'salla',
          p,
        );
        if (result.created) imported++;
        else updated++;
      }
    } else {
      // internal → ما في جلب خارجي (يمكن تهيئة كتالوج فارغ)
    }

    return { imported, updated };
  }
}
