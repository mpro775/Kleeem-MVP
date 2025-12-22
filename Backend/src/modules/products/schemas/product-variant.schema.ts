// src/modules/products/schemas/product-variant.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Currency } from '../enums/product.enums';

import { CurrencyPrice } from './currency-price.schema';

@Schema({ _id: false, timestamps: false })
export class ProductVariant {
  @Prop({ required: true, trim: true })
  sku!: string;

  @Prop({ type: String, default: null })
  barcode?: string | null;

  @Prop({ type: Map, of: String, required: true })
  attributes!: Record<string, string>; // {color: 'أحمر', size: 'L'}

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.YER })
  currency?: Currency;

  // ============ نظام الأسعار المتعددة المحسّن ============
  /**
   * العملة الأساسية للمتغير (يرث من المنتج الأب افتراضياً)
   */
  @Prop({ type: String, enum: Object.values(Currency), default: Currency.YER })
  basePriceCurrency?: Currency;

  /**
   * السعر الأساسي بالعملة الأساسية
   */
  @Prop({ type: Number, default: 0, min: 0 })
  basePrice?: number;

  /**
   * أسعار بعملات متعددة مع metadata
   * كل سعر يحتوي على:
   * - amount: السعر
   * - isManual: هل السعر مُعدّل يدوياً؟
   * - lastAutoSync: آخر تزامن تلقائي
   * - manualOverrideAt: تاريخ التعديل اليدوي
   */
  @Prop({
    type: Map,
    of: {
      type: {
        amount: { type: Number, required: true, min: 0 },
        isManual: { type: Boolean, default: false },
        lastAutoSync: { type: Date, default: null },
        manualOverrideAt: { type: Date, default: null },
      },
      _id: false,
    },
    required: true,
  })
  prices!: Map<string, CurrencyPrice>;

  @Prop({ type: Number, default: 0, min: 0 })
  priceDefault?: number;

  @Prop({ required: true, default: 0, min: 0 })
  stock!: number;

  @Prop({ type: Number, default: null, min: 0 })
  lowStockThreshold?: number | null;

  @Prop({ type: [String], default: [] })
  images!: string[];

  @Prop({ default: true })
  isAvailable!: boolean;

  @Prop({ type: Number, default: null, min: 0 })
  weight?: number | null; // وزن بالجرام
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);
