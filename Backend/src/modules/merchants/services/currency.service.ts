// src/modules/merchants/services/currency.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FlattenMaps, Model, Types } from 'mongoose';

import { Merchant, MerchantDocument } from '../schemas/merchant.schema';

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
  constructor(
    @InjectModel(Merchant.name)
    private readonly merchantModel: Model<MerchantDocument>,
  ) {}

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

    const exchangeRates = new Map(Object.entries(rates));

    await this.merchantModel
      .findByIdAndUpdate(merchantId, {
        $set: {
          'currencySettings.exchangeRates': exchangeRates,
        },
      })
      .exec();
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
  }

  async getCurrencySettings(
    merchantId: string,
  ): Promise<LeanMerchant['currencySettings']> {
    const merchant = await this.getMerchant(merchantId);
    return merchant.currencySettings;
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
