// src/modules/products/schemas/product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Product {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  originalUrl: string;

  @Prop({ default: '' })
  platform: string;

  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 0 })
  price: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop({ default: [] })
  images: string[];

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category: Types.ObjectId;

  @Prop({ default: '' })
  lowQuantity: string;

  @Prop({ default: [] })
  specsBlock: string[];

  @Prop({ default: null })
  lastFetchedAt: Date;

  @Prop({ default: null })
  lastFullScrapedAt: Date;

  @Prop({ default: null })
  errorState: string;

  @Prop({ enum: ['manual', 'api', 'scraper'], required: true })
  source: 'manual' | 'api' | 'scraper';

  @Prop({ default: null })
  sourceUrl: string;

  @Prop({ default: null })
  externalId: string;

  @Prop({ default: 'active', enum: ['active', 'inactive', 'out_of_stock'] })
  status: string;

  @Prop({ default: null })
  lastSync: Date;

  @Prop({ default: null })
  syncStatus: 'ok' | 'error' | 'pending';

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Offer' }], default: [] })
  offers: Types.ObjectId[];

  @Prop({ default: [] })
  keywords: string[];

  @Prop({ unique: true, sparse: true })
  uniqueKey: string;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ name: 'text', description: 'text' });

// Virtual field to generate redirect URL dynamically
ProductSchema.virtual('redirectUrl').get(function (this: ProductDocument) {
  const base = process.env.APP_BASE_URL || 'https://api.yourdomain.com';
  const merchantIdStr = this.merchantId.toString();
  const productIdStr = this._id.toString();
  return `${base}/r/${merchantIdStr}/${productIdStr}`;
});
