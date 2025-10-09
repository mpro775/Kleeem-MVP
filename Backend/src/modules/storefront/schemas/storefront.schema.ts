// src/modules/storefront/storefront.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CallbackError, Document, Types } from 'mongoose';
import { MAX_SLUG_LENGTH } from 'src/modules/merchants/constants/merchant.constants';

export type StorefrontDocument = Storefront & Document;

@Schema({ timestamps: true })
export class Storefront {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant?: Types.ObjectId;

  // إعدادات الثيم
  @Prop({ default: '#FF8500' })
  primaryColor?: string;

  @Prop({ enum: ['rounded', 'square'], default: 'rounded' })
  buttonStyle?: string;
  @Prop({ default: '#2575fc' })
  secondaryColor?: string;
  // بانرات/سلايدر
  @Prop({ default: '#2575fc' })
  brandDark?: string;
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
  banners?: {
    image?: string;
    text?: string;
    url?: string;
    color?: string;
    active?: boolean;
    order?: number;
  }[];

  @Prop({ type: String, index: true })
  slug?: string;

  @Prop({ required: false })
  storefrontUrl?: string;

  @Prop({ required: false, unique: true, sparse: true })
  domain?: string;
  // مثال لإعدادات إضافية مستقبلية (سلايدر منتجات، إعدادات عرض)
  @Prop({ type: [String], default: [] })
  featuredProductIds?: string[];

  // ... أضف المزيد حسب الحاجة
}

export const StorefrontSchema = SchemaFactory.createForClass(Storefront);
function normalizeSlug(input: string): string {
  let s = (input || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-');
  s = s.replace(/[^a-z0-9-]/g, '');
  s = s.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length > MAX_SLUG_LENGTH)
    s = s.slice(0, MAX_SLUG_LENGTH).replace(/-+$/g, '');
  return s;
}

StorefrontSchema.pre('validate', function (next) {
  if (this.slug) {
    this.slug = normalizeSlug(this.slug);
  }
  next();
});
StorefrontSchema.pre('save', async function (next) {
  try {
    // اجلب publicSlug من merchant وحدث الـ slug
    const mId = this.merchant;
    if (mId) {
      const MerchantModel = this.model('Merchant');
      const m = (await MerchantModel.findById(mId).select(
        'publicSlug',
      )) as unknown as { publicSlug?: string };
      if (m?.publicSlug) this.slug = m.publicSlug;
    }
    next();
  } catch (e) {
    next(e as CallbackError);
  }
});
