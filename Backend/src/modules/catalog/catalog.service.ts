import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Types } from 'mongoose';

import { SallaService } from '../integrations/salla/salla.service';
import { ZidService } from '../integrations/zid/zid.service';
import { ProductsService } from '../products/products.service';

import { CatalogRepository } from './repositories/catalog.repository';

@Injectable()
export class CatalogService {
  constructor(
    @Inject('CatalogRepository') private readonly repo: CatalogRepository,
    private readonly zid: ZidService,
    private readonly salla: SallaService,
    private readonly products: ProductsService,
  ) {}

  async syncForMerchant(merchantId: string): Promise<{
    imported: number;
    updated: number;
  }> {
    const m = await this.repo.findMerchantLean(merchantId);
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
      // internal: لا مزامنة خارجية
    }

    return { imported, updated };
  }
}
