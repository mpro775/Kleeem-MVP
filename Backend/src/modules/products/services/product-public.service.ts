import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';

import { StorefrontService } from '../../storefront/storefront.service';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductsRepository } from '../repositories/products.repository';

@Injectable()
export class ProductPublicService {
  constructor(
    @Inject('ProductsRepository')
    private readonly repo: ProductsRepository,
    private readonly storefronts: StorefrontService,
  ) {}

  getPublicProducts = async (storeSlug: string, dto: GetProductsDto) => {
    const sf = await this.storefronts.findBySlug(storeSlug);
    if (!sf)
      return {
        items: [],
        meta: { hasMore: false, nextCursor: null, count: 0 },
      };
    return this.repo.listPublicByMerchant(
      new Types.ObjectId(sf.merchantId),
      dto,
    );
  };

  async getPublicBySlug(storeSlug: string, productSlug: string) {
    const sf = await this.storefronts.findBySlug(storeSlug);
    if (!sf) return null;
    return this.repo.findPublicBySlugWithMerchant(
      new Types.ObjectId(sf.merchantId),
      productSlug,
    );
  }
}
