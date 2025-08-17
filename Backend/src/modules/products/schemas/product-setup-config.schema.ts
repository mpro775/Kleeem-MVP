// src/modules/merchants/schemas/product-setup-config.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class ProductSetupConfig {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId: Types.ObjectId;

  @Prop({ enum: ['traditional', 'ecommerce'], required: true })
  storeType: string;

  @Prop({ enum: ['zid', 'salla', 'shopify', 'custom'], default: null })
  provider?: string;

  @Prop({ default: false })
  hasApi: boolean;

  @Prop({ default: '' })
  apiUrl?: string;

  @Prop({ default: '' })
  accessToken?: string;
}
export const ProductSetupConfigSchema =
  SchemaFactory.createForClass(ProductSetupConfig);
