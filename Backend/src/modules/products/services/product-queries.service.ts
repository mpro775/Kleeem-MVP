import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

import { ProductsRepository } from '../repositories/products.repository';
import { GetProductsDto } from '../dto/get-products.dto';
import { TranslationService } from '../../../common/services/translation.service';

@Injectable()
export class ProductQueriesService {
  constructor(
    @Inject('ProductsRepository')
    private readonly repo: ProductsRepository,
    private readonly translationService: TranslationService,
    private readonly config: ConfigService,
  ) {}

  async findOne(id: string) {
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

  async findAllByMerchant(merchantId: Types.ObjectId) {
    return this.repo.findAllByMerchant(merchantId);
  }

  // بحث نصّي بسيط داخل الكتالوج (غير المتجهي)
  async searchCatalog(merchantId: string, q: string) {
    const mId = new Types.ObjectId(merchantId);
    const topN = this.config.get<number>('vars.products.heuristicTopN')!;
    const prim = await this.repo.searchHeuristics(mId, q, topN);
    if (prim.length) return prim;

    try {
      const txt = await this.repo.searchText(mId, q, topN);
      if (txt.length) return txt;
    } catch {}
    return [];
  }

  // بحث مع pagination (حسب الـ dto.limit)
  async searchProducts(merchantId: string, query: string, dto: GetProductsDto) {
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
          nextCursor: null,
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
          nextCursor: null,
          hasMore: false,
          count: textResults.length,
        },
      };
    } catch {
      return {
        items: [],
        meta: { nextCursor: null, hasMore: false, count: 0 },
      };
    }
  }
}
