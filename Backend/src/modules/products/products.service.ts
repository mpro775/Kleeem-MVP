// src/modules/products/products.service.ts (خلاصته بعد الفصل)
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';

import { ProductMetrics } from '../../metrics/product.metrics';
import { ExternalProduct } from '../integrations/types';

import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductCommandsService } from './services/product-commands.service';
import { ProductPublicService } from './services/product-public.service';
import { ProductQueriesService } from './services/product-queries.service';
import { ProductSyncService } from './services/product-sync.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly commands: ProductCommandsService,
    private readonly sync: ProductSyncService,
    private readonly queries: ProductQueriesService,
    private readonly publicService: ProductPublicService,
    private readonly productMetrics: ProductMetrics,
  ) {}

  // مثال: إنشاء منتج
  async create(dto: CreateProductDto & { merchantId: string }) {
    const created = await this.commands.create(dto);
    this.productMetrics.incCreated(dto.merchantId, dto.category);
    return created;
  }

  async update(id: string, dto: UpdateProductDto) {
    const updated = await this.commands.update(id, dto);
    if (updated) {
      this.productMetrics.incUpdated(
        updated.merchantId?.toString(),
        updated.category?.toString(),
      );
    }
    return updated;
  }

  async uploadImages(
    productId: string,
    merchantId: string,
    files: Express.Multer.File[],
    replace = false,
  ) {
    return this.commands.uploadImages(productId, merchantId, files, replace);
  }

  // Upload product images to MinIO with detailed response
  async uploadProductImagesToMinio(
    productId: string,
    merchantId: string,
    files: Express.Multer.File[],
    options: { replace?: boolean } = {},
  ) {
    return this.commands.uploadProductImagesToMinio(
      productId,
      merchantId,
      files,
      options,
    );
  }

  async setAvailability(productId: string, isAvailable: boolean) {
    return this.commands.setAvailability(productId, isAvailable);
  }

  // Find single product by ID
  async findOne(id: string) {
    return this.queries.findOne(id);
  }

  // Find all products by merchant ID
  async findAllByMerchant(merchantId: Types.ObjectId) {
    return this.queries.findAllByMerchant(merchantId);
  }

  async remove(id: string) {
    // احصل على المنتج قبل الحذف لجمع المقاييس
    const product = await this.queries.findOne(id);
    const result = await this.commands.remove(id);
    if (product) {
      this.productMetrics.incDeleted(
        product.merchantId?.toString(),
        product.category?.toString(),
      );
    }
    return result;
  }

  // بحث نصي بسيط داخل الكتالوج (غير المتجهي)
  async searchCatalog(merchantId: string, q: string) {
    return this.queries.searchCatalog(merchantId, q);
  }

  // Search products with pagination
  async searchProducts(merchantId: string, query: string, dto: GetProductsDto) {
    return this.queries.searchProducts(merchantId, query, dto);
  }
  async upsertExternalProduct(
    merchantId: string,
    provider: 'zid' | 'salla',
    p: ExternalProduct,
  ): Promise<{ created: boolean; id: string }> {
    return this.sync.upsertExternalProduct(merchantId, provider, p);
  }

  // Get product by store slug and product slug (for public access)
  getPublicProducts = async (storeSlug: string, dto: GetProductsDto) => {
    return this.publicService.getPublicProducts(storeSlug, dto);
  };

  async getPublicBySlug(storeSlug: string, productSlug: string) {
    return this.publicService.getPublicBySlug(storeSlug, productSlug);
  }

  async listByMerchant(merchantId: string, dto: GetProductsDto) {
    return this.queries.listByMerchant(merchantId, dto);
  }
}
