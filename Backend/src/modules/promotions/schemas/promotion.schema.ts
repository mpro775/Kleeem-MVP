// src/modules/promotions/schemas/promotion.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PromotionDocument = HydratedDocument<Promotion>;

export enum PromotionType {
  PERCENTAGE = 'percentage',
  FIXED_AMOUNT = 'fixed_amount',
  CART_THRESHOLD = 'cart_threshold', // خصم تلقائي عند تجاوز مبلغ معين
}

export enum ApplyTo {
  ALL = 'all', // كل المنتجات
  CATEGORIES = 'categories', // فئات محددة
  PRODUCTS = 'products', // منتجات محددة
}

export enum PromotionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  EXPIRED = 'expired',
  SCHEDULED = 'scheduled',
}

@Schema({ timestamps: true })
export class Promotion {
  _id?: Types.ObjectId;

  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop({ type: String, default: '' })
  description?: string;

  @Prop({
    type: String,
    enum: Object.values(PromotionType),
    required: true,
  })
  type!: PromotionType;

  @Prop({ required: true, min: 0 })
  discountValue!: number; // النسبة المئوية أو المبلغ الثابت

  @Prop({ type: Number, default: null, min: 0 })
  maxDiscountAmount?: number | null; // الحد الأقصى للخصم (للنسبة المئوية)

  // ============ الشروط ============
  @Prop({ type: Number, default: 0, min: 0 })
  minCartAmount!: number; // الحد الأدنى للسلة

  @Prop({
    type: String,
    enum: Object.values(ApplyTo),
    default: ApplyTo.ALL,
  })
  applyTo!: ApplyTo;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  categoryIds?: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  productIds?: Types.ObjectId[];

  // ============ التواريخ ============
  @Prop({ type: Date, default: null })
  startDate?: Date | null;

  @Prop({ type: Date, default: null })
  endDate?: Date | null;

  // ============ الأولوية والعرض ============
  @Prop({ type: Number, default: 0 })
  priority!: number; // ترتيب التطبيق (الأعلى أولاً)

  @Prop({ type: Boolean, default: false })
  countdownTimer!: boolean; // عرض عداد تنازلي

  // ============ الحالة ============
  @Prop({
    type: String,
    enum: Object.values(PromotionStatus),
    default: PromotionStatus.ACTIVE,
  })
  status!: PromotionStatus;

  // ============ إحصائيات ============
  @Prop({ type: Number, default: 0, min: 0 })
  timesUsed?: number; // عدد مرات الاستخدام

  @Prop({ type: Number, default: 0, min: 0 })
  totalDiscountGiven?: number; // إجمالي الخصم الممنوح

  // ============ حدود الاستخدام ============
  @Prop({ type: Number, default: null, min: 0 })
  usageLimit?: number | null; // عدد مرات الاستخدام الكلي (null = غير محدود)
}

export const PromotionSchema = SchemaFactory.createForClass(Promotion);

// ============ فهارس ============
// فهرس أساسي للتاجر
PromotionSchema.index(
  {
    merchantId: 1,
    status: 1,
    priority: -1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للتواريخ النشطة
PromotionSchema.index(
  {
    merchantId: 1,
    status: 1,
    startDate: 1,
    endDate: 1,
  },
  { background: true },
);

// فهرس للأولوية
PromotionSchema.index(
  {
    merchantId: 1,
    priority: -1,
    status: 1,
  },
  { background: true },
);

// تحديث الحالة تلقائياً بناءً على التاريخ
PromotionSchema.pre('save', function (next) {
  const now = new Date();

  if (this.startDate && now < this.startDate) {
    this.status = PromotionStatus.SCHEDULED;
  } else if (this.endDate && now > this.endDate) {
    this.status = PromotionStatus.EXPIRED;
  } else if (
    this.usageLimit &&
    this.timesUsed &&
    this.timesUsed >= this.usageLimit
  ) {
    this.status = PromotionStatus.EXPIRED;
  } else if (
    this.status !== PromotionStatus.INACTIVE &&
    this.status !== PromotionStatus.EXPIRED
  ) {
    this.status = PromotionStatus.ACTIVE;
  }

  next();
});

