// src/modules/products/services/product-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { TranslationService } from '../../../common/services/translation.service';
import { Currency } from '../enums/product.enums';
import { Product, ProductDocument } from '../schemas/product.schema';

@Injectable()
export class ProductValidationService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly translationService: TranslationService,
  ) {}

  /**
   * التحقق من أن SKU فريد داخل التاجر
   */
  async validateUniqueSku(
    merchantId: string | Types.ObjectId,
    sku: string,
    excludeProductId?: string | Types.ObjectId,
  ): Promise<void> {
    const mId = new Types.ObjectId(merchantId);
    const query: Record<string, unknown> = {
      merchantId: mId,
      hasVariants: true,
      'variants.sku': sku,
    };

    if (excludeProductId) {
      query._id = { $ne: new Types.ObjectId(excludeProductId) };
    }

    const existing = await this.productModel.findOne(query).lean().exec();

    if (existing) {
      throw new BadRequestException(
        this.translationService.translate('products.errors.skuExists', {
          args: { sku },
        }),
      );
    }
  }

  /**
   * التحقق من أن جميع SKUs في مصفوفة المتغيرات فريدة
   */
  async validateAllSkus(
    merchantId: string | Types.ObjectId,
    skus: string[],
    excludeProductId?: string | Types.ObjectId,
  ): Promise<void> {
    // التحقق من التفرد داخل المصفوفة نفسها
    const duplicatesWithin = skus.filter(
      (sku, index) => skus.indexOf(sku) !== index,
    );
    if (duplicatesWithin.length > 0) {
      throw new BadRequestException(
        this.translationService.translate('products.errors.duplicateSkus', {
          args: { skus: duplicatesWithin.join(', ') },
        }),
      );
    }

    // التحقق من قاعدة البيانات
    for (const sku of skus) {
      await this.validateUniqueSku(merchantId, sku, excludeProductId);
    }
  }

  /**
   * التحقق من أن Barcode فريد داخل التاجر (اختياري - تحذير فقط)
   */
  async checkBarcodeUniqueness(
    merchantId: string | Types.ObjectId,
    barcode: string,
    excludeProductId?: string | Types.ObjectId,
  ): Promise<{ isDuplicate: boolean; existingProductId?: string }> {
    const mId = new Types.ObjectId(merchantId);
    const query: Record<string, unknown> = {
      merchantId: mId,
      hasVariants: true,
      'variants.barcode': barcode,
    };

    if (excludeProductId) {
      query._id = { $ne: new Types.ObjectId(excludeProductId) };
    }

    const existing = await this.productModel.findOne(query).lean().exec();

    if (!existing) {
      return { isDuplicate: false };
    }

    const existingProductId = existing._id?.toString();

    if (!existingProductId) {
      return { isDuplicate: true };
    }

    return {
      isDuplicate: true,
      existingProductId,
    };
  }

  /**
   * التحقق من صحة المنتجات الرقمية
   */
  validateDigitalProduct(
    productType: 'physical' | 'digital' | 'service' | undefined,
    digitalAsset?: { downloadUrl: string; fileSize?: number; format?: string },
  ): void {
    if (productType === 'digital' && !digitalAsset?.downloadUrl) {
      throw new BadRequestException(
        this.translationService.translate(
          'products.errors.digitalAssetRequired',
        ),
      );
    }
  }

  /**
   * التحقق من صحة النشر المؤجل
   */
  validateScheduledPublish(
    status: 'draft' | 'published' | 'scheduled' | 'archived' | undefined,
    scheduledPublishAt?: Date,
  ): void {
    if (status === 'scheduled' && !scheduledPublishAt) {
      throw new BadRequestException(
        this.translationService.translate(
          'products.errors.scheduledDateRequired',
        ),
      );
    }

    if (scheduledPublishAt && new Date(scheduledPublishAt) < new Date()) {
      throw new BadRequestException(
        this.translationService.translate('products.errors.scheduledDatePast'),
      );
    }
  }

  /**
   * التحقق من صحة المنتجات الشبيهة (حد أقصى 10)
   */
  async validateRelatedProducts(
    merchantId: string | Types.ObjectId,
    relatedProductIds: string[],
    currentProductId?: string | Types.ObjectId,
  ): Promise<void> {
    if (relatedProductIds.length > 10) {
      throw new BadRequestException(
        this.translationService.translate(
          'products.errors.tooManyRelatedProducts',
        ),
      );
    }

    // التحقق من أن المنتجات موجودة وتابعة لنفس التاجر
    const mId = new Types.ObjectId(merchantId);
    const ids = relatedProductIds.map((id) => new Types.ObjectId(id));

    // منع المنتج من الإشارة لنفسه
    if (currentProductId) {
      const currentId = new Types.ObjectId(currentProductId);
      const hasSelf = ids.some((id) => id.equals(currentId));
      if (hasSelf) {
        throw new BadRequestException(
          this.translationService.translate(
            'products.errors.cannotRelateToSelf',
          ),
        );
      }
    }

    const count = await this.productModel
      .countDocuments({
        _id: { $in: ids },
        merchantId: mId,
      })
      .exec();

    if (count !== ids.length) {
      throw new BadRequestException(
        this.translationService.translate(
          'products.errors.invalidRelatedProducts',
        ),
      );
    }
  }

  /**
   * التحقق من صحة المتغيرات
   */
  validateVariants(
    hasVariants: boolean | undefined,
    variants:
      | Array<{
          sku: string;
          prices: Record<string, number> | Map<string, number>;
          stock: number;
        }>
      | undefined,
    baseCurrency: Currency = Currency.YER,
  ): void {
    if (hasVariants && (!variants || variants.length === 0)) {
      throw new BadRequestException(
        this.translationService.translate('products.errors.variantsRequired'),
      );
    }

    if (!hasVariants && variants && variants.length > 0) {
      throw new BadRequestException(
        this.translationService.translate(
          'products.errors.hasVariantsMismatch',
        ),
      );
    }

    if (variants && variants.length > 0) {
      variants.forEach((variant) => {
        const { prices } = this.normalizePrices(variant.prices, baseCurrency);
        const basePrice = prices.get(baseCurrency);
        if (basePrice === undefined) {
          throw new BadRequestException(
            `سعر العملة الأساسية ${baseCurrency} مطلوب لكل متغير`,
          );
        }
      });
    }
  }

  /**
   * يحوّل خريطة الأسعار إلى Map مع التحقق من وجود العملة الأساسية
   */
  normalizePrices(
    prices: Record<string, number> | Map<string, number> | undefined,
    baseCurrency: Currency = Currency.YER,
  ): { prices: Map<string, number>; basePrice: number } {
    if (!prices) {
      throw new BadRequestException(
        this.translationService.translate('products.errors.priceRequired') ||
          'حقل الأسعار مطلوب',
      );
    }

    const entries =
      prices instanceof Map
        ? Array.from(prices.entries())
        : Object.entries(prices);
    if (!entries.length) {
      throw new BadRequestException('يجب توفير سعر واحد على الأقل');
    }

    const normalized = new Map<string, number>();
    for (const [codeRaw, value] of entries) {
      const code = String(codeRaw).toUpperCase();
      if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
        throw new BadRequestException(
          `قيمة غير صالحة للعملة ${code}: يجب أن تكون رقمًا غير سالب`,
        );
      }
      normalized.set(code, value);
    }

    const basePrice = normalized.get(baseCurrency);
    if (basePrice === undefined) {
      throw new BadRequestException(
        `السعر بالعملة الأساسية ${baseCurrency} مطلوب`,
      );
    }

    return { prices: normalized, basePrice };
  }
}
