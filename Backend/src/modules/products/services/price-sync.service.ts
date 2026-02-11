// src/modules/products/services/price-sync.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { CurrencyService } from '../../merchants/services/currency.service';
import {
  Merchant,
  MerchantDocument,
} from '../../merchants/schemas/merchant.schema';
import { Currency } from '../enums/product.enums';
import {
  CurrencyPrice,
  createCurrencyPrice,
} from '../schemas/currency-price.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { ProductVariant } from '../schemas/product-variant.schema';

/**
 * خيارات توليد الأسعار
 */
export interface GeneratePricesOptions {
  /** السعر الأساسي */
  basePrice: number;
  /** العملة الأساسية */
  baseCurrency: string;
  /** معرف التاجر */
  merchantId: string;
  /** أسعار يدوية اختيارية */
  customPrices?: Record<string, number> | undefined;
}

/**
 * خيارات تحديث سعر يدوي
 */
export interface SetManualPriceOptions {
  /** معرف المنتج */
  productId: string;
  /** رمز العملة */
  currency: string;
  /** السعر الجديد */
  amount: number;
  /** SKU للمتغير (اختياري) */
  variantSku?: string | undefined;
}

/**
 * خيارات إعادة السعر للتلقائي
 */
export interface ResetToAutoPriceOptions {
  /** معرف المنتج */
  productId: string;
  /** رمز العملة */
  currency: string;
  /** SKU للمتغير (اختياري) */
  variantSku?: string | undefined;
  /** هل يتم إعادة حساب السعر؟ */
  recalculate?: boolean | undefined;
}

/**
 * نتيجة توليد الأسعار
 */
export interface GeneratedPrices {
  prices: Map<string, CurrencyPrice>;
  basePrice: number;
  baseCurrency: string;
}

/**
 * PriceSyncService
 * خدمة مزامنة الأسعار - تدير توليد وتحديث أسعار العملات المتعددة
 */
@Injectable()
export class PriceSyncService {
  private readonly logger = new Logger(PriceSyncService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    @Inject(forwardRef(() => CurrencyService))
    private readonly currencyService: CurrencyService,
  ) { }

  /**
   * توليد أسعار لجميع العملات المدعومة
   * @param options خيارات التوليد
   * @returns خريطة الأسعار
   */
  async generatePrices(
    options: GeneratePricesOptions,
  ): Promise<GeneratedPrices> {
    const { basePrice, baseCurrency, merchantId, customPrices } = options;

    // جلب إعدادات التاجر
    const merchant = await this.getMerchant(merchantId);
    const supportedCurrencies = merchant.currencySettings
      ?.supportedCurrencies || [baseCurrency];

    const prices = new Map<string, CurrencyPrice>();

    // السعر الأساسي
    prices.set(baseCurrency, createCurrencyPrice(basePrice, false));

    // توليد أسعار للعملات الأخرى
    for (const currency of supportedCurrencies) {
      if (currency === baseCurrency) continue;

      // التحقق من وجود سعر يدوي
      if (customPrices && customPrices[currency] !== undefined) {
        prices.set(currency, createCurrencyPrice(customPrices[currency], true));
        continue;
      }

      // حساب السعر تلقائياً
      try {
        const convertedPrice = await this.currencyService.convertPrice(
          basePrice,
          {
            fromCurrency: baseCurrency,
            toCurrency: currency,
            merchantId,
          },
        );
        prices.set(currency, createCurrencyPrice(convertedPrice, false));
      } catch (error) {
        this.logger.warn(
          `فشل تحويل السعر من ${baseCurrency} إلى ${currency}: ${error}`,
        );
        // في حالة الفشل، لا نضيف السعر
      }
    }

    return {
      prices,
      basePrice,
      baseCurrency,
    };
  }

  /**
   * توليد أسعار للمتغيرات
   * @param variants المتغيرات
   * @param merchantId معرف التاجر
   * @param defaultBaseCurrency العملة الأساسية الافتراضية
   * @returns المتغيرات مع الأسعار المولّدة
   */
  async generateVariantsPrices(
    variants: ProductVariant[],
    merchantId: string,
    defaultBaseCurrency: string,
  ): Promise<ProductVariant[]> {
    const updatedVariants: ProductVariant[] = [];

    for (const variant of variants) {
      const baseCurrency = variant.basePriceCurrency || defaultBaseCurrency;
      const basePrice =
        variant.basePrice ||
        this.getBasePriceFromPrices(variant.prices, baseCurrency);

      if (basePrice === undefined || basePrice === null) {
        updatedVariants.push(variant);
        continue;
      }

      const { prices } = await this.generatePrices({
        basePrice,
        baseCurrency,
        merchantId,
        customPrices: this.extractCustomPrices(variant.prices),
      });

      updatedVariants.push({
        ...variant,
        prices,
        basePrice,
        basePriceCurrency: baseCurrency as Currency,
      });
    }

    return updatedVariants;
  }

  /**
   * تعيين سعر يدوي لعملة معينة
   * @param options خيارات التعيين
   */
  async setManualPrice(
    options: SetManualPriceOptions,
  ): Promise<ProductDocument> {
    const { productId, currency, amount, variantSku } = options;

    const product = await this.getProduct(productId);

    if (variantSku) {
      // تحديث سعر المتغير
      return this.setVariantManualPrice(product, variantSku, currency, amount);
    }

    // تحديث سعر المنتج
    const prices = this.normalizePrices(product.prices);
    const existingPrice = prices.get(currency);

    prices.set(currency, {
      amount,
      isManual: true,
      lastAutoSync: existingPrice?.lastAutoSync || null,
      manualOverrideAt: new Date(),
    });

    product.prices = prices;
    await product.save();

    this.logger.log(
      `تم تعيين سعر يدوي للمنتج ${productId} بعملة ${currency}: ${amount}`,
    );

    return product;
  }

  /**
   * إعادة السعر للوضع التلقائي
   * @param options خيارات الإعادة
   */
  async resetToAutoPrice(
    options: ResetToAutoPriceOptions,
  ): Promise<ProductDocument> {
    const { productId, currency, variantSku, recalculate = true } = options;

    const product = await this.getProduct(productId);

    if (variantSku) {
      // إعادة سعر المتغير
      return this.resetVariantToAutoPrice(
        product,
        variantSku,
        currency,
        recalculate,
      );
    }

    const prices = this.normalizePrices(product.prices);
    const merchantId = product.merchantId?.toString();

    if (!merchantId) {
      throw new BadRequestException('معرف التاجر غير موجود');
    }

    const baseCurrency =
      product.basePriceCurrency || product.currency || Currency.YER;
    const basePrice =
      product.basePrice || this.getBasePriceFromPrices(prices, baseCurrency);

    if (basePrice === undefined) {
      throw new BadRequestException('السعر الأساسي غير موجود');
    }

    let newAmount: number;

    if (recalculate && currency !== baseCurrency) {
      // إعادة حساب السعر من سعر الصرف
      newAmount = await this.currencyService.convertPrice(basePrice, {
        fromCurrency: baseCurrency,
        toCurrency: currency,
        merchantId,
      });
    } else {
      // الاحتفاظ بالسعر الحالي
      newAmount = prices.get(currency)?.amount || 0;
    }

    prices.set(currency, {
      amount: newAmount,
      isManual: false,
      lastAutoSync: new Date(),
      manualOverrideAt: null,
    });

    product.prices = prices;
    await product.save();

    this.logger.log(
      `تم إعادة سعر المنتج ${productId} بعملة ${currency} للوضع التلقائي`,
    );

    return product;
  }

  /**
   * مزامنة أسعار المنتجات عند تغيير سعر الصرف
   * يُحدّث فقط الأسعار غير اليدوية
   * @param merchantId معرف التاجر
   * @param affectedCurrencies العملات المتأثرة
   */
  async syncPricesOnExchangeRateChange(
    merchantId: string,
    affectedCurrencies: string[],
  ): Promise<{ updatedCount: number }> {
    this.logger.log(
      `بدء مزامنة أسعار التاجر ${merchantId} للعملات: ${affectedCurrencies.join(', ')}`,
    );

    const merchant = await this.getMerchant(merchantId);
    const baseCurrency = merchant.currencySettings?.baseCurrency || 'YER';

    // جلب جميع منتجات التاجر
    const products = await this.productModel
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .exec();

    let updatedCount = 0;

    for (const product of products) {
      let updated = false;
      const prices = this.normalizePrices(product.prices);
      const productBaseCurrency =
        product.basePriceCurrency || product.currency || baseCurrency;
      const basePrice =
        product.basePrice ||
        this.getBasePriceFromPrices(prices, productBaseCurrency);

      if (basePrice === undefined) continue;

      // تحديث أسعار العملات المتأثرة (غير اليدوية فقط)
      for (const currency of affectedCurrencies) {
        if (currency === productBaseCurrency) continue;

        const priceData = prices.get(currency);

        // تجاوز الأسعار اليدوية
        if (priceData?.isManual) {
          this.logger.debug(
            `تجاوز السعر اليدوي للمنتج ${product._id} بعملة ${currency}`,
          );
          continue;
        }

        try {
          const newPrice = await this.currencyService.convertPrice(basePrice, {
            fromCurrency: productBaseCurrency,
            toCurrency: currency,
            merchantId,
          });

          prices.set(currency, createCurrencyPrice(newPrice, false));
          updated = true;
        } catch (error) {
          this.logger.warn(
            `فشل تحديث سعر المنتج ${product._id} بعملة ${currency}: ${error}`,
          );
        }
      }

      // تحديث أسعار المتغيرات أيضاً
      if (product.hasVariants && product.variants) {
        for (const variant of product.variants) {
          const variantPrices = this.normalizePrices(variant.prices);
          const variantBaseCurrency =
            variant.basePriceCurrency || productBaseCurrency;
          const variantBasePrice =
            variant.basePrice ||
            this.getBasePriceFromPrices(variantPrices, variantBaseCurrency);

          if (variantBasePrice === undefined) continue;

          for (const currency of affectedCurrencies) {
            if (currency === variantBaseCurrency) continue;

            const priceData = variantPrices.get(currency);
            if (priceData?.isManual) continue;

            try {
              const newPrice = await this.currencyService.convertPrice(
                variantBasePrice,
                {
                  fromCurrency: variantBaseCurrency,
                  toCurrency: currency,
                  merchantId,
                },
              );

              variantPrices.set(currency, createCurrencyPrice(newPrice, false));
              variant.prices = variantPrices;
              updated = true;
            } catch (error) {
              this.logger.warn(
                `فشل تحديث سعر المتغير ${variant.sku} بعملة ${currency}: ${error}`,
              );
            }
          }
        }
      }

      if (updated) {
        product.prices = prices;
        await product.save();
        updatedCount++;
      }
    }

    this.logger.log(`تمت مزامنة ${updatedCount} منتج للتاجر ${merchantId}`);

    return { updatedCount };
  }

  /**
   * حساب أسعار العرض لجميع العملات
   * @param product المنتج
   * @param discountPercentage نسبة الخصم
   */
  calculateOfferPrices(
    prices: Map<string, CurrencyPrice>,
    baseCurrency: string,
    baseOfferPrice: number,
    discountPercentage: number,
  ): Map<string, { originalAmount: number; offerAmount: number }> {
    const result = new Map<
      string,
      { originalAmount: number; offerAmount: number }
    >();

    prices.forEach((priceData, currency) => {
      let offerAmount: number;

      if (priceData.isManual) {
        // الأسعار اليدوية: تطبيق نفس نسبة الخصم
        offerAmount = priceData.amount * (1 - discountPercentage / 100);
      } else if (currency === baseCurrency) {
        // العملة الأساسية: استخدام سعر العرض مباشرة
        offerAmount = baseOfferPrice;
      } else {
        // العملات الأخرى: حساب النسبة من السعر الأصلي
        offerAmount = priceData.amount * (1 - discountPercentage / 100);
      }

      result.set(currency, {
        originalAmount: priceData.amount,
        offerAmount: Math.round(offerAmount * 100) / 100,
      });
    });

    return result;
  }

  /**
   * تعيين أسعار متعددة دفعة واحدة
   */
  async setBulkPrices(
    productId: string,
    pricesInput: Array<{
      currency: string;
      amount: number;
      isManual?: boolean;
    }>,
    variantSku?: string,
  ): Promise<ProductDocument> {
    const product = await this.getProduct(productId);

    if (variantSku) {
      return this.setBulkVariantPrices(product, variantSku, pricesInput);
    }

    const prices = this.normalizePrices(product.prices);

    for (const { currency, amount, isManual = true } of pricesInput) {
      const existingPrice = prices.get(currency);

      prices.set(currency, {
        amount,
        isManual,
        lastAutoSync: isManual
          ? existingPrice?.lastAutoSync || null
          : new Date(),
        manualOverrideAt: isManual ? new Date() : null,
      });
    }

    product.prices = prices;
    await product.save();

    return product;
  }

  // ==================== Helper Methods ====================

  private async getProduct(productId: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('معرف المنتج غير صالح');
    }

    const product = await this.productModel.findById(productId).exec();

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    return product;
  }

  private async getMerchant(merchantId: string): Promise<MerchantDocument> {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }

    const merchant = await this.merchantModel.findById(merchantId).exec();

    if (!merchant) {
      throw new NotFoundException('التاجر غير موجود');
    }

    return merchant;
  }

  private normalizePrices(
    prices:
      | Map<string, CurrencyPrice>
      | Record<string, CurrencyPrice | number>
      | undefined,
  ): Map<string, CurrencyPrice> {
    if (!prices) return new Map();

    if (prices instanceof Map) {
      // تحويل القيم القديمة (number) إلى الشكل الجديد
      const normalized = new Map<string, CurrencyPrice>();
      prices.forEach((value, key) => {
        if (typeof value === 'number') {
          normalized.set(key, createCurrencyPrice(value, false));
        } else if (typeof value === 'object' && 'amount' in value) {
          normalized.set(key, value);
        }
      });
      return normalized;
    }

    const map = new Map<string, CurrencyPrice>();
    Object.entries(prices).forEach(([currency, value]) => {
      if (typeof value === 'number') {
        map.set(currency, createCurrencyPrice(value, false));
      } else if (typeof value === 'object' && 'amount' in value) {
        map.set(currency, value);
      }
    });
    return map;
  }

  private getBasePriceFromPrices(
    prices: Map<string, CurrencyPrice> | undefined,
    baseCurrency: string,
  ): number | undefined {
    if (!prices) return undefined;

    const priceData = prices.get(baseCurrency);
    if (!priceData) return undefined;

    if (typeof priceData === 'number') return priceData;
    if (typeof priceData === 'object' && 'amount' in priceData) {
      return priceData.amount;
    }

    return undefined;
  }

  private extractCustomPrices(
    prices: Map<string, CurrencyPrice> | undefined,
  ): Record<string, number> | undefined {
    if (!prices) return undefined;

    const customPrices: Record<string, number> = {};
    let hasCustom = false;

    prices.forEach((value, key) => {
      if (typeof value === 'object' && value.isManual) {
        customPrices[key] = value.amount;
        hasCustom = true;
      }
    });

    return hasCustom ? customPrices : undefined;
  }

  private async setVariantManualPrice(
    product: ProductDocument,
    variantSku: string,
    currency: string,
    amount: number,
  ): Promise<ProductDocument> {
    if (!product.variants || product.variants.length === 0) {
      throw new NotFoundException('المنتج لا يحتوي على متغيرات');
    }

    const variantIndex = product.variants.findIndex(
      (v) => v.sku === variantSku,
    );
    if (variantIndex === -1) {
      throw new NotFoundException(`المتغير ${variantSku} غير موجود`);
    }

    const variant = product.variants[variantIndex];
    const prices = this.normalizePrices(variant.prices);
    const existingPrice = prices.get(currency);

    prices.set(currency, {
      amount,
      isManual: true,
      lastAutoSync: existingPrice?.lastAutoSync || null,
      manualOverrideAt: new Date(),
    });

    variant.prices = prices;
    await product.save();

    return product;
  }

  private async resetVariantToAutoPrice(
    product: ProductDocument,
    variantSku: string,
    currency: string,
    recalculate: boolean,
  ): Promise<ProductDocument> {
    if (!product.variants || product.variants.length === 0) {
      throw new NotFoundException('المنتج لا يحتوي على متغيرات');
    }

    const variantIndex = product.variants.findIndex(
      (v) => v.sku === variantSku,
    );
    if (variantIndex === -1) {
      throw new NotFoundException(`المتغير ${variantSku} غير موجود`);
    }

    const variant = product.variants[variantIndex];
    const merchantId = product.merchantId?.toString();

    if (!merchantId) {
      throw new BadRequestException('معرف التاجر غير موجود');
    }

    const prices = this.normalizePrices(variant.prices);
    const baseCurrency =
      variant.basePriceCurrency ||
      product.basePriceCurrency ||
      product.currency ||
      Currency.YER;
    const basePrice =
      variant.basePrice || this.getBasePriceFromPrices(prices, baseCurrency);

    if (basePrice === undefined) {
      throw new BadRequestException('السعر الأساسي للمتغير غير موجود');
    }

    let newAmount: number;

    if (recalculate && currency !== baseCurrency) {
      newAmount = await this.currencyService.convertPrice(basePrice, {
        fromCurrency: baseCurrency,
        toCurrency: currency,
        merchantId,
      });
    } else {
      newAmount = prices.get(currency)?.amount || 0;
    }

    prices.set(currency, {
      amount: newAmount,
      isManual: false,
      lastAutoSync: new Date(),
      manualOverrideAt: null,
    });

    variant.prices = prices;
    await product.save();

    return product;
  }

  private async setBulkVariantPrices(
    product: ProductDocument,
    variantSku: string,
    pricesInput: Array<{
      currency: string;
      amount: number;
      isManual?: boolean;
    }>,
  ): Promise<ProductDocument> {
    if (!product.variants || product.variants.length === 0) {
      throw new NotFoundException('المنتج لا يحتوي على متغيرات');
    }

    const variantIndex = product.variants.findIndex(
      (v) => v.sku === variantSku,
    );
    if (variantIndex === -1) {
      throw new NotFoundException(`المتغير ${variantSku} غير موجود`);
    }

    const variant = product.variants[variantIndex];
    const prices = this.normalizePrices(variant.prices);

    for (const { currency, amount, isManual = true } of pricesInput) {
      const existingPrice = prices.get(currency);

      prices.set(currency, {
        amount,
        isManual,
        lastAutoSync: isManual
          ? existingPrice?.lastAutoSync || null
          : new Date(),
        manualOverrideAt: isManual ? new Date() : null,
      });
    }

    variant.prices = prices;
    await product.save();

    return product;
  }
}
