// src/modules/coupons/schemas/coupon.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CouponDocument = HydratedDocument<Coupon>;

export enum CouponType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  FREE_SHIPPING = 'free_shipping',
}

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
}

@Schema({ timestamps: true })
export class Coupon {
  _id?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId!: Types.ObjectId;

  @Prop({ required: true, trim: true, uppercase: true })
  code!: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(CouponType),
    required: true,
  })
  type!: CouponType;

  @Prop({ required: true, min: 0 })
  value!: number; // النسبة المئوية أو المبلغ الثابت

  // ============ شروط الاستخدام ============
  @Prop({ type: Number, default: 0, min: 0 })
  minOrderAmount?: number; // الحد الأدنى للطلب

  @Prop({ type: Number, default: null, min: 0 })
  maxDiscountAmount?: number | null; // الحد الأقصى للخصم (للنسبة المئوية)

  @Prop({ type: Number, default: null, min: 0 })
  usageLimit?: number | null; // عدد مرات الاستخدام الكلي (null = غير محدود)

  @Prop({ type: Number, default: 0, min: 0 })
  usedCount!: number; // عدد المرات المستخدمة

  @Prop({ type: Boolean, default: false })
  oneTimePerCustomer!: boolean; // استخدام واحد لكل عميل

  @Prop({ type: [String], default: [] })
  allowedCustomers?: string[]; // أرقام هواتف العملاء المسموح لهم (فارغ = الكل)

  @Prop({ type: [String], default: [] })
  usedByCustomers!: string[]; // أرقام هواتف العملاء الذين استخدموا الكوبون

  // ============ نطاق التطبيق ============
  @Prop({ type: Boolean, default: true })
  storeWide!: boolean; // على المتجر كامل

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  products?: Types.ObjectId[]; // منتجات محددة

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  categories?: Types.ObjectId[]; // فئات محددة

  // ============ التواريخ ============
  @Prop({ type: Date, default: null })
  startDate?: Date | null;

  @Prop({ type: Date, default: null })
  endDate?: Date | null;

  // ============ الحالة ============
  @Prop({
    type: String,
    enum: Object.values(CouponStatus),
    default: CouponStatus.ACTIVE,
  })
  status!: CouponStatus;

  // ============ إحصائيات ============
  @Prop({ type: Number, default: 0, min: 0 })
  totalDiscountGiven?: number; // إجمالي الخصم الممنوح
}

export const CouponSchema = SchemaFactory.createForClass(Coupon);

// ============ فهارس ============
// فهرس فريد للكود داخل التاجر
CouponSchema.index(
  { merchantId: 1, code: 1 },
  { unique: true, background: true },
);

// فهرس للحالة والتاريخ
CouponSchema.index(
  {
    merchantId: 1,
    status: 1,
    endDate: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للبحث بالكود
CouponSchema.index({ code: 1 }, { background: true });

// فهرس للتواريخ النشطة
CouponSchema.index(
  {
    merchantId: 1,
    status: 1,
    startDate: 1,
    endDate: 1,
  },
  { background: true },
);

// تحديث الحالة تلقائياً بناءً على التاريخ
CouponSchema.pre('save', function (next) {
  const now = new Date();

  if (this.endDate && now > this.endDate) {
    this.status = CouponStatus.EXPIRED;
  } else if (this.usageLimit && this.usedCount >= this.usageLimit) {
    this.status = CouponStatus.EXPIRED;
  }

  next();
});
