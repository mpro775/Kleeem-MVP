// src/modules/products/schemas/product-review.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductReviewDocument = ProductReview & Document;

export enum ProductReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class ProductReview {
  @Prop({ required: true, index: true })
  merchantId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', index: true })
  orderId?: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating!: number;

  @Prop({ maxlength: 1000 })
  comment?: string;

  @Prop({
    type: String,
    enum: [
      ProductReviewStatus.PENDING,
      ProductReviewStatus.APPROVED,
      ProductReviewStatus.REJECTED,
    ],
    default: ProductReviewStatus.PENDING,
    index: true,
  })
  status!: ProductReviewStatus;

  @Prop({ type: Date, default: Date.now })
  reviewedAt!: Date;

  @Prop({ type: Date, default: null })
  approvedAt?: Date;

  @Prop({ type: Date, default: null })
  rejectedAt?: Date;

  // إحصائيات التقييم المحسوبة
  @Prop({ type: Boolean, default: false })
  isVerifiedPurchase!: boolean; // هل تم الشراء فعلاً

  @Prop({ type: Number, default: 0 })
  helpfulCount!: number; // عدد المفيد

  @Prop({ type: Number, default: 0 })
  notHelpfulCount!: number; // عدد غير المفيد
}

export const ProductReviewSchema = SchemaFactory.createForClass(ProductReview);

// فهارس للبحث السريع
ProductReviewSchema.index({ merchantId: 1, productId: 1, status: 1 });
ProductReviewSchema.index({ merchantId: 1, customerId: 1 });
ProductReviewSchema.index({ merchantId: 1, orderId: 1 });
