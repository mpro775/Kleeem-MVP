// src/modules/products/schemas/product-variant.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { Currency } from '../enums/product.enums';

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

  @Prop({ type: Map, of: Number, required: true })
  prices!: Map<string, number>;

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
