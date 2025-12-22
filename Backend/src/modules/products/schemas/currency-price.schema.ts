// src/modules/products/schemas/currency-price.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

/**
 * CurrencyPrice - بنية السعر لكل عملة
 * تخزن السعر مع metadata للتمييز بين الأسعار التلقائية واليدوية
 */
@Schema({ _id: false })
export class CurrencyPrice {
  /** السعر بالعملة */
  @Prop({ required: true, min: 0 })
  amount!: number;

  /** هل السعر مُعدّل يدوياً؟ إذا كان true، لن يتزامن مع تغيير سعر الصرف */
  @Prop({ default: false })
  isManual!: boolean;

  /** آخر تزامن تلقائي مع سعر الصرف */
  @Prop({ type: Date, default: null })
  lastAutoSync?: Date | null;

  /** تاريخ التعديل اليدوي (إن وجد) */
  @Prop({ type: Date, default: null })
  manualOverrideAt?: Date | null;
}

export const CurrencyPriceSchema = SchemaFactory.createForClass(CurrencyPrice);

/**
 * نوع مساعد لخريطة الأسعار
 * Map<currencyCode, CurrencyPrice>
 */
export type CurrencyPriceMap = Map<string, CurrencyPrice>;

/**
 * واجهة لإنشاء سعر عملة جديد
 */
export interface CreateCurrencyPriceInput {
  amount: number;
  isManual?: boolean;
}

/**
 * دالة مساعدة لإنشاء كائن CurrencyPrice
 */
export function createCurrencyPrice(
  amount: number,
  isManual: boolean = false,
): CurrencyPrice {
  const price = new CurrencyPrice();
  price.amount = amount;
  price.isManual = isManual;
  price.lastAutoSync = isManual ? null : new Date();
  price.manualOverrideAt = isManual ? new Date() : null;
  return price;
}

/**
 * دالة مساعدة لتحويل Map إلى Object للـ API responses
 */
export function currencyPriceMapToObject(
  priceMap: CurrencyPriceMap | Map<string, CurrencyPrice> | undefined,
): Record<string, CurrencyPrice> {
  if (!priceMap) return {};

  const result: Record<string, CurrencyPrice> = {};
  priceMap.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

/**
 * دالة مساعدة لتحويل Object إلى Map
 */
export function objectToCurrencyPriceMap(
  obj: Record<string, CurrencyPrice | number> | undefined,
): CurrencyPriceMap {
  const map = new Map<string, CurrencyPrice>();
  if (!obj) return map;

  Object.entries(obj).forEach(([currency, value]) => {
    if (typeof value === 'number') {
      // تحويل من الشكل القديم (number فقط)
      map.set(currency, createCurrencyPrice(value, false));
    } else {
      map.set(currency, value);
    }
  });

  return map;
}
