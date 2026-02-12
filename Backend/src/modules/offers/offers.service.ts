import { Injectable, Inject } from '@nestjs/common';

import { CurrencyPrice } from '../products/schemas/currency-price.schema';

import { MerchantRepository } from './repositories/merchant.repository';
import {
  ProductRepository,
  ProductLean,
  OfferInfo,
} from './repositories/product.repository';
import { PRODUCT_REPOSITORY, MERCHANT_REPOSITORY } from './tokens';

/**
 * نتيجة حساب أسعار العرض لجميع العملات
 */
export interface MultiCurrencyOfferPrices {
  /** العملة */
  currency: string;
  /** السعر القديم */
  priceOld: number;
  /** السعر الجديد بعد العرض */
  priceNew: number;
  /** نسبة الخصم */
  discountPct: number | null;
  /** هل السعر يدوي؟ */
  isManual: boolean;
}

@Injectable()
export class OffersService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
    @Inject(MERCHANT_REPOSITORY)
    private readonly merchants: MerchantRepository,
  ) {}

  private computeIsActive(offer: OfferInfo): boolean {
    if (!offer?.enabled) return false;
    if (!this.offerHasValue(offer)) return false;
    return this.offerInDateRange(offer);
  }

  private offerHasValue(offer: OfferInfo): boolean {
    if (offer.newPrice != null || offer.discountValue != null) return true;
    if (
      offer.type === 'buy_x_get_y' &&
      offer.buyQuantity != null &&
      offer.getQuantity != null
    ) {
      return true;
    }
    if (
      offer.type === 'quantity_based' &&
      offer.quantityThreshold != null &&
      offer.quantityDiscount != null
    ) {
      return true;
    }
    return false;
  }

  private offerInDateRange(offer: OfferInfo): boolean {
    const now = Date.now();
    const s = offer.startAt ? new Date(offer.startAt).getTime() : -Infinity;
    const e = offer.endAt ? new Date(offer.endAt).getTime() : Infinity;
    return now >= s && now <= e;
  }

  private discountPct(oldPrice?: number, newPrice?: number): number | null {
    if (oldPrice && newPrice != null && oldPrice > 0 && newPrice < oldPrice) {
      return Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    }
    return null;
  }

  private buildPublicUrl(
    p: ProductLean,
    publicSlug?: string,
  ): string | undefined {
    const slug = p.slug || String(p._id);
    if (p.storefrontDomain) return `https://${p.storefrontDomain}/p/${slug}`;
    if (p.storefrontSlug) return `/${p.storefrontSlug}/store/p/${slug}`;
    if (publicSlug) return `/${publicSlug}/store/p/${slug}`;
    return undefined;
  }

  async listAllOffers(
    merchantId: string,
    opts: { limit: number; offset: number },
  ): Promise<Record<string, unknown>[]> {
    const [publicSlug, products] = await Promise.all([
      this.merchants.getPublicSlug(merchantId),
      this.products.findOffersByMerchant(merchantId, opts),
    ]);

    return products.map((p) => this._transformProductToOffer(p, publicSlug));
  }

  private _transformProductToOffer(
    p: ProductLean,
    publicSlug?: string,
  ): Record<string, unknown> {
    const isActive = this.computeIsActive(p.offer ?? {});
    const prices = this._calculatePrices(p, isActive);

    return {
      id: String(p._id),
      name: p.name,
      slug: p.slug,
      ...prices,
      currency: p.currency,
      discountPct: this.discountPct(
        prices.priceOld ?? undefined,
        prices.priceNew ?? undefined,
      ),
      url: this.buildPublicUrl(p, publicSlug),
      isActive,
      period: {
        startAt: p.offer?.startAt ?? null,
        endAt: p.offer?.endAt ?? null,
      },
      image:
        Array.isArray(p.images) && p.images.length ? p.images[0] : undefined,
    };
  }

  private _calculatePrices(
    p: ProductLean,
    isActive: boolean,
  ): {
    priceOld: number | null;
    priceNew: number | null;
    priceEffective: number;
  } {
    const priceOld = p.offer?.oldPrice ?? p.price ?? null;
    const priceNew = this.computePriceNewFromOffer(p.offer, isActive, priceOld);
    const priceEffective = this.computePriceEffective(
      isActive,
      priceNew,
      p.price ?? priceNew ?? 0,
    );

    return {
      priceOld: priceOld ?? null,
      priceNew,
      priceEffective,
    };
  }

  private computePriceNewFromOffer(
    offer: OfferInfo | undefined,
    isActive: boolean,
    priceOld: number | null,
  ): number | null {
    const directNew = offer?.newPrice ?? null;
    if (directNew != null) return directNew;
    if (!isActive || priceOld == null) return null;

    const pctVal = offer?.type === 'percentage' ? offer.discountValue : null;
    if (pctVal != null) {
      return Math.max(0, priceOld * (1 - pctVal / 100));
    }

    const fixedVal =
      offer?.type === 'fixed_amount' ? offer.discountValue : null;
    if (fixedVal != null) {
      return Math.max(0, priceOld - fixedVal);
    }

    return null;
  }

  private computePriceEffective(
    isActive: boolean,
    priceNew: number | null,
    fallback: number,
  ): number {
    return isActive && priceNew != null ? Number(priceNew) : Number(fallback);
  }

  // ============ حساب أسعار العرض لجميع العملات ============

  /**
   * حساب أسعار العرض لجميع العملات
   * الأسعار اليدوية: يُطبق عليها نفس نسبة الخصم
   * الأسعار التلقائية: تُحسب من السعر المخصوم بالعملة الأساسية
   */
  calculateMultiCurrencyOfferPrices(
    prices: Map<string, CurrencyPrice> | Record<string, CurrencyPrice | number>,
    baseCurrency: string,
    offer: OfferInfo | undefined,
  ): MultiCurrencyOfferPrices[] {
    const isActive = this.computeIsActive(offer ?? {});
    const results: MultiCurrencyOfferPrices[] = [];

    // تحويل الأسعار إلى Map إن لزم
    const pricesMap = this.normalizePricesMap(prices);

    // الحصول على السعر الأساسي
    const basePriceData = pricesMap.get(baseCurrency);
    const basePrice = this.extractAmount(basePriceData);

    if (basePrice === undefined) {
      return results;
    }

    // حساب الخصم على العملة الأساسية
    const baseOfferPrice = this.calculateOfferPrice(basePrice, offer, isActive);
    const discountPercentage =
      basePrice > 0 ? ((basePrice - baseOfferPrice) / basePrice) * 100 : 0;

    // حساب أسعار جميع العملات
    pricesMap.forEach((priceData, currency) => {
      const amount = this.extractAmount(priceData);
      if (amount === undefined) return;

      const isManual =
        typeof priceData === 'object' && 'isManual' in priceData
          ? priceData.isManual
          : false;

      let offerPrice: number;

      if (isManual) {
        // الأسعار اليدوية: تطبيق نفس نسبة الخصم
        offerPrice = isActive
          ? Math.max(0, amount * (1 - discountPercentage / 100))
          : amount;
      } else if (currency === baseCurrency) {
        // العملة الأساسية
        offerPrice = baseOfferPrice;
      } else {
        // العملات الأخرى: نفس نسبة الخصم
        offerPrice = isActive
          ? Math.max(0, amount * (1 - discountPercentage / 100))
          : amount;
      }

      results.push({
        currency,
        priceOld: amount,
        priceNew: Math.round(offerPrice * 100) / 100,
        discountPct: this.discountPct(amount, offerPrice),
        isManual,
      });
    });

    return results;
  }

  /**
   * حساب سعر العرض لعملة واحدة
   */
  calculateSingleCurrencyOfferPrice(
    originalPrice: number,
    offer: OfferInfo | undefined,
  ): { priceNew: number; discountPct: number | null; isActive: boolean } {
    const isActive = this.computeIsActive(offer ?? {});
    const priceNew = this.calculateOfferPrice(originalPrice, offer, isActive);

    return {
      priceNew,
      discountPct: this.discountPct(originalPrice, priceNew),
      isActive,
    };
  }

  /**
   * حساب السعر بعد تطبيق العرض
   */
  private calculateOfferPrice(
    originalPrice: number,
    offer: OfferInfo | undefined,
    isActive: boolean,
  ): number {
    if (!isActive || !offer) return originalPrice;

    // إذا كان هناك سعر جديد محدد
    if (offer.newPrice != null) {
      return offer.newPrice;
    }

    // حساب الخصم حسب النوع
    if (offer.type === 'percentage' && offer.discountValue != null) {
      return Math.max(0, originalPrice * (1 - offer.discountValue / 100));
    }

    if (offer.type === 'fixed_amount' && offer.discountValue != null) {
      return Math.max(0, originalPrice - offer.discountValue);
    }

    // أنواع العروض الأخرى (buy_x_get_y, quantity_based) لا تغير السعر الأساسي
    return originalPrice;
  }

  /**
   * تحويل الأسعار إلى Map موحد
   */
  private normalizePricesMap(
    prices: Map<string, CurrencyPrice> | Record<string, CurrencyPrice | number>,
  ): Map<string, CurrencyPrice | number> {
    if (prices instanceof Map) {
      return prices;
    }

    return new Map(Object.entries(prices));
  }

  /**
   * استخراج القيمة من CurrencyPrice أو number
   */
  private extractAmount(
    priceData: CurrencyPrice | number | undefined,
  ): number | undefined {
    if (priceData === undefined) return undefined;
    if (typeof priceData === 'number') return priceData;
    if (typeof priceData === 'object' && 'amount' in priceData) {
      return priceData.amount;
    }
    return undefined;
  }
}
