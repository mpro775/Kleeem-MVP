// src/modules/products/schemas/product-variant.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema({ _id: false, timestamps: false })
export class ProductVariant {
  @Prop({ required: true, trim: true })
  sku!: string;

  @Prop({ type: String, default: null })
  barcode?: string | null;

  @Prop({ type: Map, of: String, required: true })
  attributes!: Record<string, string>; // {color: 'أحمر', size: 'L'}

  @Prop({ required: true, min: 0 })
  price!: number;

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
