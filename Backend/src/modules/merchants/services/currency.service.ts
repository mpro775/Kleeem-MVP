// src/modules/merchants/services/currency.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model, Types } from 'mongoose';

import { Merchant, MerchantDocument } from '../schemas/merchant.schema';

/**
 * أحداث تغيير العملات
 */
export const CURRENCY_EVENTS = {
  EXCHANGE_RATES_UPDATED: 'exchange-rates.updated',
  BASE_CURRENCY_CHANGED: 'base-currency.changed',
  SUPPORTED_CURRENCIES_CHANGED: 'supported-currencies.changed',
} as const;

/**
 * بيانات حدث تغيير أسعار الصرف
 */
export interface ExchangeRatesUpdatedEvent {
  merchantId: string;
  affectedCurrencies: string[];
  previousRates?: Record<string, number> | undefined;
  newRates: Record<string, number>;
}

/**
 * بيانات حدث تغيير العملة الأساسية
 */
export interface BaseCurrencyChangedEvent {
  merchantId: string;
  previousCurrency: string;
  newCurrency: string;
}

/**
 * بيانات حدث تغيير العملات المدعومة
 */
export interface SupportedCurrenciesChangedEvent {
  merchantId: string;
  addedCurrencies: string[];
  removedCurrencies: string[];
}

export interface ConvertPriceOptions {
  fromCurrency: string;
  toCurrency: string;
  merchantId: string;
}

export interface DisplayPriceOptions {
  productPrice: number;
  productCurrency: string;
  targetCurrency: string;
  merchantId: string;
  customPrices?: Map<string, number>; // أسعار مخصصة للمنتج
}

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) { }

  async convertPrice(
    amount: number,
    options: ConvertPriceOptions,
  ): Promise<number> {
    // إذا كانت العملتان نفسهما، لا حاجة للتحويل
    if (options.fromCurrency === options.toCurrency) {
      return amount;
    }

    const merchant = await this.getMerchant(options.merchantId);
    this.ensureCurrencySupported(merchant, options.toCurrency);

    const exchangeRates = this.normalizeExchangeRates(
      merchant.currencySettings?.exchangeRates,
    );

    if (!exchangeRates) {
      throw new Error('أسعار الصرف غير متوفرة');
    }

    // التحويل من العملة الأساسية إلى العملة المستهدفة
    const baseCurrency = merchant.currencySettings?.baseCurrency || 'SAR';

    const amountInBase = this.toBaseCurrency(
      amount,
      options.fromCurrency,
      baseCurrency,
      exchangeRates,
    );

    const convertedAmount = this.fromBaseCurrency(
      amountInBase,
      options.toCurrency,
      baseCurrency,
      exchangeRates,
    );

    // تطبيق استراتيجية التقريب
    return this.roundPrice(
      convertedAmount,
      merchant.currencySettings?.roundingStrategy || 'round',
      merchant.currencySettings?.roundToNearest || 1,
    );
  }

  roundPrice(
    price: number,
    strategy: 'none' | 'ceil' | 'floor' | 'round',
    roundTo: number = 1,
  ): number {
    if (strategy === 'none') {
      return Math.round(price * 100) / 100; // تقريب لرقمين عشريين فقط
    }

    let rounded: number;

    switch (strategy) {
      case 'ceil':
        rounded = Math.ceil(price / roundTo) * roundTo;
        break;
      case 'floor':
        rounded = Math.floor(price / roundTo) * roundTo;
        break;
      case 'round':
        rounded = Math.round(price / roundTo) * roundTo;
        break;
      default:
        rounded = price;
    }

    return Math.round(rounded * 100) / 100;
  }

  async getDisplayPrice(options: DisplayPriceOptions): Promise<number> {
    // إذا كان هناك سعر مخصص للعملة المستهدفة، استخدمه
    if (options.customPrices?.has(options.targetCurrency)) {
      return options.customPrices.get(options.targetCurrency)!;
    }

    // وإلا، حوّل السعر
    return this.convertPrice(options.productPrice, {
      fromCurrency: options.productCurrency,
      toCurrency: options.targetCurrency,
      merchantId: options.merchantId,
    });
  }

  async updateExchangeRates(
    merchantId: string,
    rates: Record<string, number>,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new NotFoundException('التاجر غير موجود');
    }

    // جلب الأسعار السابقة للمقارنة
    const merchant = await this.getMerchant(merchantId);
    const previousRates = this.normalizeExchangeRates(
      merchant.currencySettings?.exchangeRates,
    );

    const exchangeRates = new Map(Object.entries(rates));

    await this.merchantModel
      .findByIdAndUpdate(merchantId, {
        $set: {
          'currencySettings.exchangeRates': exchangeRates,
        },
      })
      .exec();

    // تحديد العملات المتأثرة (المتغيرة)
    const affectedCurrencies = Object.keys(rates).filter((currency) => {
      const oldRate = previousRates?.get(currency);
      const newRate = rates[currency];
      return oldRate !== newRate;
    });

    // إطلاق حدث تغيير أسعار الصرف
    if (affectedCurrencies.length > 0) {
      const eventPayload: ExchangeRatesUpdatedEvent = {
        merchantId,
        affectedCurrencies,
        previousRates: previousRates
          ? Object.fromEntries(previousRates)
          : undefined,
        newRates: rates,
      };

      this.logger.log(
        `إطلاق حدث تغيير أسعار الصرف للتاجر ${merchantId}، العملات المتأثرة: ${affectedCurrencies.join(', ')}`,
      );

      this.eventEmitter.emit(
        CURRENCY_EVENTS.EXCHANGE_RATES_UPDATED,
        eventPayload,
      );
    }
  }

  async updateCurrencySettings(
    merchantId: string,
    settings: Partial<{
      baseCurrency: string;
      supportedCurrencies: string[];
      exchangeRates: Record<string, number>;
      roundingStrategy: 'none' | 'ceil' | 'floor' | 'round';
      roundToNearest: number;
    }>,
  ): Promise<void> {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new NotFoundException('التاجر غير موجود');
    }

    // جلب الإعدادات الحالية للمقارنة
    const merchant = await this.getMerchant(merchantId);
    const currentSettings = merchant.currencySettings;

    const updateData: Record<string, unknown> = {};

    if (settings.baseCurrency) {
      updateData['currencySettings.baseCurrency'] = settings.baseCurrency;
    }

    if (settings.supportedCurrencies) {
      updateData['currencySettings.supportedCurrencies'] =
        settings.supportedCurrencies;
    }

    if (settings.exchangeRates) {
      updateData['currencySettings.exchangeRates'] = new Map(
        Object.entries(settings.exchangeRates),
      );
    }

    if (settings.roundingStrategy) {
      updateData['currencySettings.roundingStrategy'] =
        settings.roundingStrategy;
    }

    if (settings.roundToNearest !== undefined) {
      updateData['currencySettings.roundToNearest'] = settings.roundToNearest;
    }

    await this.merchantModel
      .findByIdAndUpdate(merchantId, { $set: updateData })
      .exec();

    // إطلاق الأحداث المناسبة

    // 1. تغيير العملة الأساسية
    if (
      settings.baseCurrency &&
      settings.baseCurrency !== currentSettings?.baseCurrency
    ) {
      const eventPayload: BaseCurrencyChangedEvent = {
        merchantId,
        previousCurrency: currentSettings?.baseCurrency || 'YER',
        newCurrency: settings.baseCurrency,
      };

      this.logger.log(
        `إطلاق حدث تغيير العملة الأساسية للتاجر ${merchantId}: ${eventPayload.previousCurrency} → ${eventPayload.newCurrency}`,
      );

      this.eventEmitter.emit(
        CURRENCY_EVENTS.BASE_CURRENCY_CHANGED,
        eventPayload,
      );
    }

    // 2. تغيير العملات المدعومة
    if (settings.supportedCurrencies) {
      const currentCurrencies = currentSettings?.supportedCurrencies || [];
      const newCurrencies = settings.supportedCurrencies;

      const addedCurrencies = newCurrencies.filter(
        (c) => !currentCurrencies.includes(c),
      );
      const removedCurrencies = currentCurrencies.filter(
        (c) => !newCurrencies.includes(c),
      );

      if (addedCurrencies.length > 0 || removedCurrencies.length > 0) {
        const eventPayload: SupportedCurrenciesChangedEvent = {
          merchantId,
          addedCurrencies,
          removedCurrencies,
        };

        this.logger.log(
          `إطلاق حدث تغيير العملات المدعومة للتاجر ${merchantId}`,
        );

        this.eventEmitter.emit(
          CURRENCY_EVENTS.SUPPORTED_CURRENCIES_CHANGED,
          eventPayload,
        );
      }
    }

    // 3. تغيير أسعار الصرف
    if (settings.exchangeRates) {
      const previousRates = this.normalizeExchangeRates(
        currentSettings?.exchangeRates,
      );

      const affectedCurrencies = Object.keys(settings.exchangeRates).filter(
        (currency) => {
          const oldRate = previousRates?.get(currency);
          const newRate = settings.exchangeRates![currency];
          return oldRate !== newRate;
        },
      );

      if (affectedCurrencies.length > 0) {
        const eventPayload: ExchangeRatesUpdatedEvent = {
          merchantId,
          affectedCurrencies,
          previousRates: previousRates
            ? Object.fromEntries(previousRates)
            : undefined,
          newRates: settings.exchangeRates,
        };

        this.logger.log(`إطلاق حدث تغيير أسعار الصرف للتاجر ${merchantId}`);

        this.eventEmitter.emit(
          CURRENCY_EVENTS.EXCHANGE_RATES_UPDATED,
          eventPayload,
        );
      }
    }
  }

  async getCurrencySettings(
    merchantId: string,
  ): Promise<LeanMerchant['currencySettings']> {
    const merchant = await this.getMerchant(merchantId);
    return merchant.currencySettings;
  }

  /**
   * تحويل أسعار متعددة دفعة واحدة
   * @param amounts الأسعار المراد تحويلها
   * @param options خيارات التحويل
   * @returns الأسعار المحولة
   */
  async batchConvertPrices(
    amounts: number[],
    options: ConvertPriceOptions,
  ): Promise<number[]> {
    // إذا كانت العملتان نفسهما، لا حاجة للتحويل
    if (options.fromCurrency === options.toCurrency) {
      return amounts;
    }

    const merchant = await this.getMerchant(options.merchantId);
    this.ensureCurrencySupported(merchant, options.toCurrency);

    const exchangeRates = this.normalizeExchangeRates(
      merchant.currencySettings?.exchangeRates,
    );

    if (!exchangeRates) {
      throw new Error('أسعار الصرف غير متوفرة');
    }

    const baseCurrency = merchant.currencySettings?.baseCurrency || 'SAR';
    const roundingStrategy =
      merchant.currencySettings?.roundingStrategy || 'round';
    const roundToNearest = merchant.currencySettings?.roundToNearest || 1;

    return amounts.map((amount) => {
      const amountInBase = this.toBaseCurrency(
        amount,
        options.fromCurrency,
        baseCurrency,
        exchangeRates,
      );

      const convertedAmount = this.fromBaseCurrency(
        amountInBase,
        options.toCurrency,
        baseCurrency,
        exchangeRates,
      );

      return this.roundPrice(convertedAmount, roundingStrategy, roundToNearest);
    });
  }

  /**
   * تحويل سعر لجميع العملات المدعومة
   * @param amount السعر
   * @param fromCurrency العملة المصدر
   * @param merchantId معرف التاجر
   * @returns خريطة الأسعار بجميع العملات
   */
  async convertToAllCurrencies(
    amount: number,
    fromCurrency: string,
    merchantId: string,
  ): Promise<Map<string, number>> {
    const merchant = await this.getMerchant(merchantId);
    const supportedCurrencies = merchant.currencySettings
      ?.supportedCurrencies || [fromCurrency];

    const results = new Map<string, number>();

    for (const currency of supportedCurrencies) {
      if (currency === fromCurrency) {
        results.set(currency, amount);
        continue;
      }

      try {
        const convertedAmount = await this.convertPrice(amount, {
          fromCurrency,
          toCurrency: currency,
          merchantId,
        });
        results.set(currency, convertedAmount);
      } catch (error) {
        this.logger.warn(
          `فشل تحويل ${amount} من ${fromCurrency} إلى ${currency}: ${error}`,
        );
      }
    }

    return results;
  }

  private async getMerchant(merchantId: string): Promise<LeanMerchant> {
    if (!Types.ObjectId.isValid(merchantId)) {
      throw new NotFoundException('التاجر غير موجود');
    }

    const merchant = await this.merchantModel
      .findById(merchantId)
      .lean<LeanMerchant>()
      .exec();

    if (!merchant) {
      throw new NotFoundException('التاجر غير موجود');
    }

    return merchant;
  }

  private ensureCurrencySupported(
    merchant: LeanMerchant,
    currency: string,
  ): void {
    const supported = merchant.currencySettings?.supportedCurrencies ?? [];

    if (!supported.includes(currency)) {
      throw new Error(`العملة ${currency} غير مدعومة`);
    }
  }

  private toBaseCurrency(
    amount: number,
    fromCurrency: string,
    baseCurrency: string,
    exchangeRates: Map<string, number>,
  ): number {
    if (fromCurrency === baseCurrency) {
      return amount;
    }

    const rateFromBase = exchangeRates.get(fromCurrency);

    if (!rateFromBase) {
      throw new Error(`سعر الصرف للعملة ${fromCurrency} غير متوفر`);
    }

    return amount / rateFromBase;
  }

  private fromBaseCurrency(
    amount: number,
    toCurrency: string,
    baseCurrency: string,
    exchangeRates: Map<string, number>,
  ): number {
    if (toCurrency === baseCurrency) {
      return amount;
    }

    const rateToTarget = exchangeRates.get(toCurrency);

    if (!rateToTarget) {
      throw new Error(`سعر الصرف للعملة ${toCurrency} غير متوفر`);
    }

    return amount * rateToTarget;
  }

  private normalizeExchangeRates(
    exchangeRates?:
      | Map<string, number>
      | Record<string, number>
      | Types.Map<number>
      | null,
  ): Map<string, number> | undefined {
    if (!exchangeRates) {
      return undefined;
    }

    if (typeof (exchangeRates as Map<string, number>).get === 'function') {
      return exchangeRates as Map<string, number>;
    }

    return new Map(Object.entries(exchangeRates as Record<string, number>));
  }
}

type MerchantCurrencySettings = NonNullable<Merchant['currencySettings']>;

type LeanCurrencySettings = Omit<MerchantCurrencySettings, 'exchangeRates'> & {
  exchangeRates?:
  | Map<string, number>
  | Record<string, number>
  | Types.Map<number>
  | undefined;
};

type LeanMerchant = Omit<FlattenMaps<MerchantDocument>, 'currencySettings'> & {
  currencySettings?: LeanCurrencySettings;
  _id: Types.ObjectId;
};
