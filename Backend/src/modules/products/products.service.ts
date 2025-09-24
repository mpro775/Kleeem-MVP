// src/modules/products/products.service.ts (خلاصته بعد الفصل)
import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { PaginationResult } from 'src/common';

import { ProductMetrics } from '../../metrics/product.metrics';
import { ExternalProduct } from '../integrations/types';

import { CreateProductDto } from './dto/create-product.dto';
import { GetProductsDto } from './dto/get-products.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsRepository } from './repositories/products.repository';
import { ProductDocument } from './schemas/product.schema';
import { ProductCommandsService } from './services/product-commands.service';
import { ProductPublicService } from './services/product-public.service';
import { ProductQueriesService } from './services/product-queries.service';
import { ProductSyncService } from './services/product-sync.service';
import { ProductLean } from './types';

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
  async create(
    dto: CreateProductDto & { merchantId: string },
  ): Promise<ProductDocument> {
    const created = await this.commands.create(dto);
    this.productMetrics.incCreated(dto.merchantId, dto.category);
    return created;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
  ): Promise<ProductDocument | null> {
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
  ): Promise<{ urls: string[] }> {
    return this.commands.uploadImages(productId, merchantId, files);
  }

  // Upload product images to MinIO with detailed response
  async uploadProductImagesToMinio(
    productId: string,
    merchantId: string,
    files: Express.Multer.File[],
  ): Promise<{
    urls: string[];
    count: number;
    accepted: number;
    remaining: number;
  }> {
    return this.commands.uploadProductImagesToMinio(
      productId,
      merchantId,
      files,
    );
  }

  async setAvailability(
    productId: string,
    isAvailable: boolean,
  ): Promise<ReturnType<ProductsRepository['setAvailability']>> {
    return this.commands.setAvailability(productId, isAvailable);
  }

  // Find single product by ID
  async findOne(id: string): Promise<ProductDocument> {
    return this.queries.findOne(id);
  }

  // Find all products by merchant ID
  async findAllByMerchant(merchantId: Types.ObjectId): Promise<ProductLean[]> {
    return this.queries.findAllByMerchant(merchantId);
  }

  async remove(id: string): Promise<{ message: string }> {
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
  async searchCatalog(merchantId: string, q: string): Promise<ProductLean[]> {
    return this.queries.searchCatalog(merchantId, q);
  }

  // Search products with pagination
  async searchProducts(
    merchantId: string,
    query: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> {
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
  getPublicProducts = async (
    storeSlug: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> => {
    return this.publicService.getPublicProducts(storeSlug, dto);
  };

  async getPublicBySlug(
    storeSlug: string,
    productSlug: string,
  ): Promise<ProductLean | null> {
    return this.publicService.getPublicBySlug(storeSlug, productSlug);
  }

  async listByMerchant(
    merchantId: string,
    dto: GetProductsDto,
  ): Promise<PaginationResult<ProductLean>> {
    return this.queries.listByMerchant(merchantId, dto);
  }
}
