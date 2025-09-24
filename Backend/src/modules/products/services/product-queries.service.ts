import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';

import { PaginationResult } from '../../../common/dto/pagination.dto';
import { TranslationService } from '../../../common/services/translation.service';
import { GetProductsDto } from '../dto/get-products.dto';
import { ProductsRepository } from '../repositories/products.repository';
import { ProductDocument } from '../schemas/product.schema';
import { ProductLean } from '../types';

@Injectable()
export class ProductQueriesService {
  constructor(
    @Inject('ProductsRepository')
    private readonly repo: ProductsRepository,
    private readonly translationService: TranslationService,
    private readonly config: ConfigService,
  ) {}

  async findOne(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException(
        this.translationService.translate('validation.mongoId'),
      );
    const product = await this.repo.findById(new Types.ObjectId(id));
    if (!product)
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );
    return product;
  }

  async findAllByMerchant(merchantId: Types.ObjectId): Promise<ProductLean[]> {
    return this.repo.findAllByMerchant(merchantId);
  }

  async listByMerchant(
    merchantId: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> {
    const mId = new Types.ObjectId(merchantId);
    return this.repo.list(mId, dto);
  }

  // بحث نصّي بسيط داخل الكتالوج (غير المتجهي)
  async searchCatalog(merchantId: string, q: string): Promise<ProductLean[]> {
    const mId = new Types.ObjectId(merchantId);
    const topN = this.config.get<number>('vars.products.heuristicTopN')!;
    const prim = await this.repo.searchHeuristics(mId, q, topN);
    if (prim.length) return prim;

    try {
      const txt = await this.repo.searchText(mId, q, topN);
      if (txt.length) return txt;
    } catch {
      return [];
    }
    return [];
  }

  // بحث مع pagination (حسب الـ dto.limit)
  async searchProducts(
    merchantId: string,
    query: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> {
    const mId = new Types.ObjectId(merchantId);
    const limit =
      dto.limit || this.config.get<number>('vars.products.searchDefaultLimit')!;

    // Heuristic أولًا
    const heuristicResults = await this.repo.searchHeuristics(
      mId,
      query,
      limit,
    );
    if (heuristicResults.length > 0) {
      return {
        items: heuristicResults,
        meta: {
          nextCursor: undefined,
          hasMore: false,
          count: heuristicResults.length,
        },
      };
    }

    // Text search
    try {
      const textResults = await this.repo.searchText(mId, query, limit);
      return {
        items: textResults,
        meta: {
          nextCursor: undefined,
          hasMore: false,
          count: textResults.length,
        },
      };
    } catch {
      return {
        items: [],
        meta: { nextCursor: undefined, hasMore: false, count: 0 },
      };
    }
  }
}
