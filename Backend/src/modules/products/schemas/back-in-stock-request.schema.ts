// src/modules/products/schemas/back-in-stock-request.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BackInStockRequestDocument = BackInStockRequest & Document;

export enum BackInStockStatus {
  PENDING = 'pending',
  NOTIFIED = 'notified',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class BackInStockRequest {
  _id?: Types.ObjectId;

  @Prop({ required: true, index: true })
  merchantId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  variantId?: string | null; // SKU للمتغير

  @Prop({ type: Types.ObjectId, ref: 'Customer', index: true })
  customerId?: Types.ObjectId | undefined;

  @Prop({ required: true })
  contact!: string; // phone or email

  @Prop({
    type: String,
    enum: [BackInStockStatus.PENDING, BackInStockStatus.NOTIFIED, BackInStockStatus.CANCELLED],
    default: BackInStockStatus.PENDING,
    index: true,
  })
  status!: BackInStockStatus;

  @Prop({ type: Date, default: null })
  notifiedAt?: Date;
}

export const BackInStockRequestSchema = SchemaFactory.createForClass(BackInStockRequest);

// فهارس للبحث السريع
BackInStockRequestSchema.index({ merchantId: 1, productId: 1, variantId: 1, status: 1 });
BackInStockRequestSchema.index({ merchantId: 1, contact: 1 });
BackInStockRequestSchema.index({ merchantId: 1, customerId: 1 });
