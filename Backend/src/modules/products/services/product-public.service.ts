import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';

import { PaginationResult } from '../../../common/dto/pagination.dto';
import { StorefrontService } from '../../storefront/storefront.service';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductsRepository } from '../repositories/products.repository';
import { ProductLean } from '../types';

import type { Storefront } from '../../storefront/schemas/storefront.schema';

@Injectable()
export class ProductPublicService {
  constructor(
    @Inject('ProductsRepository')
    private readonly repo: ProductsRepository,
    private readonly storefronts: StorefrontService,
  ) {}

  getPublicProducts = async (
    storeSlug: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> => {
    const sf = (await this.storefronts.findBySlug(
      storeSlug,
    )) as Storefront | null;
    if (!sf)
      return {
        items: [],
        meta: { hasMore: false, nextCursor: undefined, count: 0 },
      };
    return this.repo.listPublicByMerchant(new Types.ObjectId(sf.merchant), dto);
  };

  async getPublicBySlug(
    storeSlug: string,
    productSlug: string,
  ): Promise<ProductLean | null> {
    const sf = (await this.storefronts.findBySlug(
      storeSlug,
    )) as Storefront | null;
    if (!sf) return null;
    return this.repo.findPublicBySlugWithMerchant(
      new Types.ObjectId(sf.merchant),
      productSlug,
    );
  }
}
