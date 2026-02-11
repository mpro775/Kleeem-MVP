// src/modules/products/schemas/stock-change-log.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StockChangeLogDocument = HydratedDocument<StockChangeLog>;

/**
 * نوع التغيير في المخزون
 */
export enum StockChangeType {
  MANUAL = 'manual', // تعديل يدوي
  ORDER_PLACED = 'order_placed', // خصم بسبب طلب
  ORDER_CANCELLED = 'order_cancelled', // إرجاع بسبب إلغاء
  ORDER_RETURNED = 'order_returned', // إرجاع
  IMPORT = 'import', // استيراد CSV
  SYNC = 'sync', // مزامنة من مصدر خارجي
  ADJUSTMENT = 'adjustment', // تعديل/جرد
}

@Schema({
  timestamps: true,
  collection: 'stock_change_logs',
})
export class StockChangeLog {
  _id?: Types.ObjectId;

  /** معرف التاجر */
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId!: Types.ObjectId;

  /** معرف المنتج */
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true, index: true })
  productId!: Types.ObjectId;

  /** اسم المنتج (للعرض السريع) */
  @Prop({ type: String, required: true })
  productName!: string;

  /** SKU للمتغير (null إذا كان المنتج بدون متغيرات) */
  @Prop({ type: String, default: null })
  variantSku?: string | null;

  /** الكمية السابقة */
  @Prop({ type: Number, required: true })
  previousStock!: number;

  /** الكمية الجديدة */
  @Prop({ type: Number, required: true })
  newStock!: number;

  /** مقدار التغيير (موجب للزيادة، سالب للنقص) */
  @Prop({ type: Number, required: true })
  changeAmount!: number;

  /** نوع التغيير */
  @Prop({
    type: String,
    enum: Object.values(StockChangeType),
    default: StockChangeType.MANUAL,
  })
  changeType!: StockChangeType;

  /** سبب التغيير (نص حر) */
  @Prop({ type: String, default: null })
  reason?: string | null;

  /** معرف المستخدم الذي قام بالتغيير */
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  changedBy!: Types.ObjectId;

  /** اسم المستخدم (للعرض السريع) */
  @Prop({ type: String, required: true })
  changedByName!: string;

  /** معرف الطلب المرتبط (إن وجد) */
  @Prop({ type: Types.ObjectId, ref: 'Order', default: null })
  orderId?: Types.ObjectId | null;

  /** تاريخ التغيير */
  @Prop({ type: Date, default: Date.now })
  changedAt!: Date;

  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const StockChangeLogSchema =
  SchemaFactory.createForClass(StockChangeLog);

// فهارس للبحث السريع
StockChangeLogSchema.index({ merchantId: 1, createdAt: -1 });
StockChangeLogSchema.index({ productId: 1, createdAt: -1 });
StockChangeLogSchema.index({ merchantId: 1, productId: 1, createdAt: -1 });
StockChangeLogSchema.index({ changedBy: 1, createdAt: -1 });
StockChangeLogSchema.index({ changeType: 1, createdAt: -1 });
