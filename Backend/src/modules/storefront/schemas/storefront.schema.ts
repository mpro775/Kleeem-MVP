// src/modules/storefront/storefront.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StorefrontDocument = Storefront & Document;

@Schema({ timestamps: true })
export class Storefront {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant: Types.ObjectId;

  // إعدادات الثيم
  @Prop({ default: '#FF8500' })
  primaryColor: string;

  @Prop({ enum: ['rounded', 'square'], default: 'rounded' })
  buttonStyle: string;
  @Prop({ default: '#2575fc' })
  secondaryColor: string;
  // بانرات/سلايدر
  @Prop({
    type: [
      {
        _id: false,
        image: String,
        text: String,
        url: String,
        color: String,
        active: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
      },
    ],
    default: [],
  })
  banners: {
    image?: string;
    text?: string;
    url?: string;
    color?: string;
    active?: boolean;
    order?: number;
  }[];

  @Prop({ required: false, unique: true, sparse: true })
  slug?: string;

  @Prop({ required: false })
  storefrontUrl?: string;

  @Prop({ required: false, unique: true, sparse: true })
  domain?: string;
  // مثال لإعدادات إضافية مستقبلية (سلايدر منتجات، إعدادات عرض)
  @Prop({ type: [String], default: [] })
  featuredProductIds: string[];

  // ... أضف المزيد حسب الحاجة
}

export const StorefrontSchema = SchemaFactory.createForClass(Storefront);
