// src/modules/products/services/inventory.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { OutOfStockError } from '../../../common/errors/business-errors';
import { TranslationService } from '../../../common/services/translation.service';

import type { ProductsRepository } from '../repositories/products.repository';
import type { ProductDocument } from '../schemas/product.schema';

export interface StockItem {
  productId: string;
  quantity: number;
  variantSku?: string;
}

export interface StockCheckResult {
  available: boolean;
  items: Array<{
    productId: string;
    variantSku?: string;
    requested: number;
    available: number;
    isUnlimited: boolean;
  }>;
}

export interface StockInfo {
  productId: string;
  stock: number;
  lowStockThreshold: number | null;
  isUnlimitedStock: boolean;
  isLowStock: boolean;
  hasVariants: boolean;
  variants?: Array<{
    sku: string;
    stock: number;
    lowStockThreshold: number | null;
    isLowStock: boolean;
  }>;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @Inject('ProductsRepository')
    private readonly repo: ProductsRepository,
    private readonly translationService: TranslationService,
  ) {}

  /** تحقق من توفر مجموعة عناصر */
  async checkAvailability(items: StockItem[]): Promise<StockCheckResult> {
    const results: StockCheckResult = { available: true, items: [] };

    for (const item of items) {
      const checkResult = await this.checkSingleItem(item);
      results.items.push(checkResult);
      if (
        !checkResult.isUnlimited &&
        checkResult.available < checkResult.requested
      ) {
        results.available = false;
      }
    }
    return results;
  }

  /** تحقق من توفر عنصر واحد */
  // eslint-disable-next-line complexity
  private async checkSingleItem(item: StockItem) {
    const product = await this.repo.findById(
      new Types.ObjectId(item.productId),
    );

    const base = {
      productId: item.productId,
      requested: item.quantity,
    } as const;

    if (!product) {
      return {
        ...base,
        ...(item.variantSku ? { variantSku: item.variantSku } : {}),
        available: 0,
        isUnlimited: false,
      };
    }

    if (product.isUnlimitedStock) {
      return {
        ...base,
        ...(item.variantSku ? { variantSku: item.variantSku } : {}),
        available: Number.MAX_SAFE_INTEGER,
        isUnlimited: true,
      };
    }

    if (product.hasVariants && item.variantSku) {
      const variant = product.variants?.find((v) => v.sku === item.variantSku);
      return {
        ...base,
        ...(item.variantSku ? { variantSku: item.variantSku } : {}),
        available: variant?.stock ?? 0,
        isUnlimited: false,
      };
    }

    return {
      ...base,
      ...(item.variantSku ? { variantSku: item.variantSku } : {}),
      available: product.stock ?? 0,
      isUnlimited: false,
    };
  }

  /** خصم المخزون، يرمي OutOfStockError إذا غير كاف */
  async deductStock(items: StockItem[]): Promise<void> {
    const availability = await this.checkAvailability(items);
    if (!availability.available) {
      const insufficient = availability.items.find(
        (i) => !i.isUnlimited && i.available < i.requested,
      );
      if (insufficient) {
        throw new OutOfStockError(
          insufficient.productId,
          insufficient.available,
          this.translationService,
        );
      }
    }

    for (const item of items) {
      await this.deductSingleItem(item);
    }
  }

  private async deductSingleItem(item: StockItem): Promise<void> {
    const product = await this.repo.findById(
      new Types.ObjectId(item.productId),
    );
    if (!product || product.isUnlimitedStock) return;
    const productId = product._id;
    if (!productId) return;

    if (product.hasVariants && item.variantSku && product.variants) {
      const idx = product.variants.findIndex((v) => v.sku === item.variantSku);
      if (idx !== -1) {
        const newStock = Math.max(
          0,
          (product.variants[idx].stock ?? 0) - item.quantity,
        );
        const updatedVariants = [...product.variants];
        updatedVariants[idx] = {
          ...product.variants[idx],
          stock: newStock,
          isAvailable: newStock > 0,
        };
        await this.repo.updateById(productId, { variants: updatedVariants });
        this.logger.log(
          `Deducted ${item.quantity} from variant ${item.variantSku}. New: ${newStock}`,
        );
      }
      return;
    }

    const newStock = Math.max(0, (product.stock ?? 0) - item.quantity);
    await this.repo.updateById(productId, {
      stock: newStock,
      isAvailable: newStock > 0,
    });
    this.logger.log(
      `Deducted ${item.quantity} from product ${item.productId}. New: ${newStock}`,
    );
  }

  /** إرجاع المخزون بعد إلغاء/إرجاع */
  async restoreStock(items: StockItem[]): Promise<void> {
    for (const item of items) {
      await this.restoreSingleItem(item);
    }
  }

  private async restoreSingleItem(item: StockItem): Promise<void> {
    const product = await this.repo.findById(
      new Types.ObjectId(item.productId),
    );
    if (!product || product.isUnlimitedStock) return;
    const productId = product._id;
    if (!productId) return;

    if (product.hasVariants && item.variantSku && product.variants) {
      const idx = product.variants.findIndex((v) => v.sku === item.variantSku);
      if (idx !== -1) {
        const newStock = (product.variants[idx].stock ?? 0) + item.quantity;
        const updatedVariants = [...product.variants];
        updatedVariants[idx] = {
          ...product.variants[idx],
          stock: newStock,
          isAvailable: true,
        };
        await this.repo.updateById(productId, { variants: updatedVariants });
        this.logger.log(
          `Restored ${item.quantity} to variant ${item.variantSku}. New: ${newStock}`,
        );
      }
      return;
    }

    const newStock = (product.stock ?? 0) + item.quantity;
    await this.repo.updateById(productId, {
      stock: newStock,
      isAvailable: true,
    });
    this.logger.log(
      `Restored ${item.quantity} to product ${item.productId}. New: ${newStock}`,
    );
  }

  /** تحديث المخزون يدويًا */
  async updateStock(
    productId: string,
    quantity: number,
    variantSku?: string,
    reason?: string,
  ): Promise<ProductDocument> {
    const product = await this.repo.findById(new Types.ObjectId(productId));
    if (!product) {
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );
    }
    if (quantity < 0) {
      throw new BadRequestException(
        this.translationService.translate('validation.min'),
      );
    }

    if (product.hasVariants && variantSku && product.variants) {
      const idx = product.variants.findIndex((v) => v.sku === variantSku);
      if (idx === -1) {
        throw new NotFoundException('Variant not found');
      }
      const updatedVariants = [...product.variants];
      updatedVariants[idx] = {
        ...product.variants[idx],
        stock: quantity,
        isAvailable: quantity > 0,
      };
      const productIdObj = product._id;
      if (!productIdObj) {
        throw new BadRequestException('Product id is missing');
      }
      const updated = await this.repo.updateById(productIdObj, {
        variants: updatedVariants,
      });
      this.logger.log(
        `Updated variant ${variantSku} stock to ${quantity}. Reason: ${reason || 'N/A'}`,
      );
      return updated!;
    }

    const productIdObj = product._id;
    if (!productIdObj) {
      throw new BadRequestException('Product id is missing');
    }
    const updated = await this.repo.updateById(productIdObj, {
      stock: quantity,
      isAvailable: quantity > 0 || product.isUnlimitedStock === true,
    });
    this.logger.log(
      `Updated product ${productId} stock to ${quantity}. Reason: ${reason || 'N/A'}`,
    );
    return updated!;
  }

  /** معلومات المخزون لمنتج */
  async getStockInfo(productId: string): Promise<StockInfo> {
    const product = await this.repo.findById(new Types.ObjectId(productId));
    if (!product) {
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );
    }

    const info: StockInfo = {
      productId,
      stock: product.stock ?? 0,
      lowStockThreshold: product.lowStockThreshold ?? null,
      isUnlimitedStock: product.isUnlimitedStock ?? false,
      isLowStock: this.isLowStock(
        product.stock ?? 0,
        product.lowStockThreshold ?? null,
        product.isUnlimitedStock ?? false,
      ),
      hasVariants: product.hasVariants ?? false,
    };

    if (product.hasVariants && product.variants) {
      info.variants = product.variants.map((v) => ({
        sku: v.sku,
        stock: v.stock ?? 0,
        lowStockThreshold: v.lowStockThreshold ?? null,
        isLowStock: this.isLowStock(
          v.stock ?? 0,
          v.lowStockThreshold ?? null,
          false,
        ),
      }));
    }

    return info;
  }

  private isLowStock(
    stock: number,
    threshold: number | null,
    isUnlimited: boolean,
  ): boolean {
    if (isUnlimited) return false;
    if (threshold === null) return stock === 0;
    return stock <= threshold;
  }

  /** إجمالي المخزون (المتغيرات + الأساسي) */
  async getTotalStock(productId: string): Promise<number> {
    const product = await this.repo.findById(new Types.ObjectId(productId));
    if (!product) {
      throw new NotFoundException(
        this.translationService.translateProduct('errors.notFound'),
      );
    }
    if (product.isUnlimitedStock) return Number.MAX_SAFE_INTEGER;
    if (product.hasVariants && product.variants) {
      return product.variants.reduce((t, v) => t + (v.stock ?? 0), 0);
    }
    return product.stock ?? 0;
  }
}
