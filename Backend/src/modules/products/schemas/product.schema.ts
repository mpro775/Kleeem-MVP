// src/modules/products/schemas/product.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { NextFunction } from 'express';
import { HydratedDocument, Types } from 'mongoose';

import { Currency } from '../enums/product.enums';

import { CurrencyPrice, CurrencyPriceSchema } from './currency-price.schema';
import { ProductVariant, ProductVariantSchema } from './product-variant.schema';

export type ProductDocument = HydratedDocument<Product>;

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Product {
  _id?: Types.ObjectId;

  // Timestamps (added automatically by timestamps: true)
  createdAt?: Date;
  updatedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId?: Types.ObjectId;

  @Prop({ default: '' })
  platform?: string;

  @Prop({ required: true, trim: true, default: '' })
  name?: string;

  @Prop({ default: '' })
  shortDescription?: string;

  // محتوى غني (HTML/JSON) للوصف التفصيلي
  @Prop({ type: String, default: '' })
  richDescription?: string;

  @Prop({ default: true })
  isAvailable?: boolean;

  @Prop({ default: [] })
  images?: string[];

  @Prop({ type: Types.ObjectId, ref: 'Category' })
  category?: Types.ObjectId;

  @Prop({ default: [] })
  specsBlock?: string[];

  @Prop({ enum: ['manual', 'api'], required: true })
  source?: 'manual' | 'api';

  @Prop({ type: String, default: null })
  sourceUrl?: string | null;

  @Prop({ type: String, default: null })
  externalId?: string | null;

  @Prop({
    default: 'published',
    enum: ['draft', 'published', 'scheduled', 'archived'],
  })
  status?: 'draft' | 'published' | 'scheduled' | 'archived';

  @Prop({ type: Date, default: null })
  publishedAt?: Date | null;

  @Prop({ type: Date, default: null })
  scheduledPublishAt?: Date | null;

  @Prop({ type: Date, default: null })
  lastSync?: Date | null;

  @Prop({ type: String, default: null })
  syncStatus?: 'ok' | 'error' | 'pending' | null;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Offer' }], default: [] })
  offers?: Types.ObjectId[];

  @Prop({ default: [] })
  keywords?: string[];

  @Prop({ sparse: true })
  uniqueKey?: string;

  @Prop({ type: String, enum: Object.values(Currency), default: Currency.YER })
  currency?: Currency;

  // ============ نظام الأسعار المتعددة المحسّن ============
  /**
   * العملة الأساسية للمنتج (يرث من التاجر افتراضياً)
   * هذه العملة هي المرجع لحساب باقي العملات
   */
  @Prop({ type: String, enum: Object.values(Currency), default: Currency.YER })
  basePriceCurrency?: Currency;

  /**
   * السعر الأساسي بالعملة الأساسية
   * يُستخدم كمرجع لحساب أسعار العملات الأخرى
   */
  @Prop({ type: Number, default: 0, min: 0 })
  basePrice?: number;

  /**
   * أسعار بعملات متعددة مع metadata
   * كل سعر يحتوي على:
   * - amount: السعر
   * - isManual: هل السعر مُعدّل يدوياً؟
   * - lastAutoSync: آخر تزامن تلقائي
   * - manualOverrideAt: تاريخ التعديل اليدوي
   */
  @Prop({
    type: Map,
    of: {
      type: {
        amount: { type: Number, required: true, min: 0 },
        isManual: { type: Boolean, default: false },
        lastAutoSync: { type: Date, default: null },
        manualOverrideAt: { type: Date, default: null },
      },
      _id: false,
    },
    required: true,
  })
  prices!: Map<string, CurrencyPrice>;

  @Prop({ type: Number, default: 0 })
  priceDefault?: number; // السعر بالعملة الأساسية للفهرسة والترتيب

  // سمات المنتج المهيكلة باستخدام keySlug/valueSlugs من attribute_definitions
  @Prop({
    type: [
      {
        keySlug: { type: String, required: true, lowercase: true, trim: true },
        valueSlugs: { type: [String], required: true, default: [] },
      },
    ],
    _id: false,
    default: [],
  })
  attributes?: {
    keySlug: string;
    valueSlugs: string[];
  }[];

  hasActiveOffer?: boolean;
  priceEffective?: number;

  @Prop({
    type: {
      enabled: { type: Boolean, default: false },
      type: {
        type: String,
        enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'quantity_based'],
        default: 'percentage',
      },

      // للنوع البسيط (percentage/fixed_amount)
      discountValue: { type: Number },
      oldPrice: { type: Number },
      newPrice: { type: Number },

      // للكمية (quantity_based)
      quantityThreshold: { type: Number }, // اشتري 3
      quantityDiscount: { type: Number }, // خذ 20%

      // Buy X Get Y
      buyQuantity: { type: Number }, // اشتري 2
      getQuantity: { type: Number }, // خذ 1
      getProductId: { type: String }, // منتج آخر أو null لنفس المنتج
      getDiscount: { type: Number }, // خصم على المنتج المجاني (100% = مجاني)

      // الفترة الزمنية
      startAt: { type: Date },
      endAt: { type: Date },
    },
    _id: false,
  })
  offer?: {
    enabled: boolean;
    type?: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'quantity_based';

    // للنوع البسيط
    discountValue?: number;
    oldPrice?: number;
    newPrice?: number;

    // للكمية
    quantityThreshold?: number;
    quantityDiscount?: number;

    // Buy X Get Y
    buyQuantity?: number;
    getQuantity?: number;
    getProductId?: string;
    getDiscount?: number;

    // الفترة الزمنية
    startAt?: Date;
    endAt?: Date;
  };
  @Prop({ type: String, default: null })
  publicUrlStored?: string | null;
  // 👇 جديد
  @Prop({ type: String }) slug?: string;

  @Prop({ type: String, default: undefined }) // ← لا تستخدم null
  storefrontSlug?: string;

  @Prop({ type: String, default: undefined })
  storefrontDomain?: string;

  // ============ نظام المتغيرات ============
  @Prop({ type: [ProductVariantSchema], default: [] })
  variants?: ProductVariant[];

  @Prop({ default: false })
  hasVariants?: boolean;

  // ============ ملصقات العرض (badges) ============
  @Prop({
    type: [
      {
        label: { type: String, required: true, trim: true },
        color: { type: String, default: null },
        showOnCard: { type: Boolean, default: true },
        order: { type: Number, default: 0 },
      },
    ],
    _id: false,
    default: [],
  })
  badges?: {
    label: string;
    color?: string | null;
    showOnCard?: boolean;
    order?: number;
  }[];

  // ============ نوع المنتج ============
  @Prop({
    type: String,
    enum: ['physical', 'digital', 'service'],
    default: 'physical',
  })
  productType?: 'physical' | 'digital' | 'service';

  @Prop({
    type: {
      downloadUrl: { type: String, required: true },
      fileSize: { type: Number },
      format: { type: String },
    },
    _id: false,
    default: undefined,
  })
  digitalAsset?: {
    downloadUrl: string;
    fileSize?: number;
    format?: string;
  };

  @Prop({ default: false })
  isUnlimitedStock?: boolean;

  // ============ نظام المخزون ============
  @Prop({ type: Number, default: 0, min: 0 })
  stock?: number; // للمنتجات بدون متغيرات

  @Prop({ type: Number, default: null, min: 0 })
  lowStockThreshold?: number | null; // عتبة التنبيه للمخزون المنخفض

  // ============ المنتجات الشبيهة ============
  @Prop({ type: [{ type: Types.ObjectId, ref: 'Product' }], default: [] })
  relatedProducts?: Types.ObjectId[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);

// افتراضيات قبل الحفظ
ProductSchema.virtual('publicUrl').get(function (this: ProductDocument) {
  const pid = this.slug || this._id?.toString();

  // لو فيه دومين مخصص للمتجر: https://domain/product/:pid
  if (this.storefrontDomain) {
    return `https://${this.storefrontDomain}/product/${pid}`;
  }

  // بدون دومين: http(s)://<STORE_PUBLIC_ORIGIN>/store/:publicSlug/product/:pid
  const base = (process.env.STORE_PUBLIC_ORIGIN || '').replace(/\/+$/, '');
  const shopSlug = this.storefrontSlug || ''; // هو نفسه publicSlug
  if (base && shopSlug) {
    return `${base}/store/${shopSlug}/product/${pid}`;
  }
  if (shopSlug) {
    return `/store/${shopSlug}/product/${pid}`;
  }

  // Fallback آمن
  return base ? `${base}/product/${pid}` : `/product/${pid}`;
});
// مشتقات جاهزة في الاسترجاع
// eslint-disable-next-line complexity
function computeDerived(doc: ProductDocument) {
  const now = new Date();
  const ofr = doc.offer;

  // Check if offer is valid and active
  const isValidOffer =
    ofr?.enabled && ofr.newPrice != null && ofr.newPrice >= 0;
  let active = false;

  if (isValidOffer) {
    const startValid = !ofr.startAt || now >= new Date(ofr.startAt);
    const endValid = !ofr.endAt || now <= new Date(ofr.endAt);
    active = startValid && endValid;
  }

  doc.hasActiveOffer = active;

  // إذا كان المنتج يحتوي على variants، نحسب السعر من أقل variant متاح
  const baseCurrency = doc.basePriceCurrency || doc.currency || Currency.YER;

  /**
   * دالة مساعدة للحصول على السعر من خريطة الأسعار
   * تدعم الشكل القديم (Map<string, number>) والجديد (Map<string, CurrencyPrice>)
   */
  const getPrice = (
    prices:
      | Map<string, CurrencyPrice>
      | Map<string, number>
      | Record<string, CurrencyPrice | number>
      | undefined,
    currency: string,
  ): number | undefined => {
    if (!prices) return undefined;

    let priceData: CurrencyPrice | number | undefined;

    if (prices instanceof Map) {
      priceData = prices.get(currency);
    } else if (typeof prices === 'object' && currency in prices) {
      priceData = (prices as Record<string, CurrencyPrice | number>)[currency];
    }

    if (priceData === undefined) return undefined;

    // دعم الشكل الجديد (CurrencyPrice object)
    if (typeof priceData === 'object' && 'amount' in priceData) {
      return priceData.amount;
    }

    // دعم الشكل القديم (number مباشرة)
    if (typeof priceData === 'number') {
      return priceData;
    }

    return undefined;
  };

  // الحصول على السعر الأساسي
  let basePrice = doc.basePrice ?? getPrice(doc.prices, baseCurrency) ?? 0;

  if (doc.hasVariants && doc.variants && doc.variants.length > 0) {
    const availableVariants = doc.variants.filter((v) => v.isAvailable);
    const variantPrices = availableVariants
      .map((v) =>
        getPrice(
          v.prices as Map<string, CurrencyPrice> | undefined,
          baseCurrency,
        ),
      )
      .filter((p): p is number => typeof p === 'number' && p >= 0);
    if (variantPrices.length > 0) {
      basePrice = Math.min(...variantPrices);
    }
  }

  doc.priceDefault = basePrice;
  doc.priceEffective = active ? Number(ofr!.newPrice) : basePrice;
}
function recomputePublicUrlStored(doc: ProductDocument) {
  try {
    // الـ virtual أعلاه
    doc.publicUrlStored = (doc as unknown as { publicUrl: string }).publicUrl;
  } catch {
    // ignore
  }
}

// @ts-expect-error Mongoose types are restrictive for pre-save hooks
ProductSchema.pre('save', function (this: ProductDocument, next: NextFunction) {
  recomputePublicUrlStored(this);
  computeDerived(this);
  next();
});
ProductSchema.pre('findOneAndUpdate', function (next) {
  // عند التحديث عبر findOneAndUpdate نحتاج حساب يدويًا من الـ update
  // سنجلب الوثيقة بعد التحديث في service ونحدّثها (مُبيّن أدناه)
  next();
});
ProductSchema.post('save', function () {
  recomputePublicUrlStored(this);
});

ProductSchema.post('init', function () {
  computeDerived(this);
});
ProductSchema.post('save', function () {
  computeDerived(this);
});
ProductSchema.post('find', function (docs: ProductDocument[]) {
  docs.forEach(computeDerived);
});
ProductSchema.post('findOne', function (doc) {
  if (doc) computeDerived(doc as ProductDocument);
});
// ✅ فهارس محسّنة للـ Cursor Pagination
// فهرس أساسي للـ pagination مع merchantId
ProductSchema.index(
  {
    merchantId: 1,
    status: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للبحث النصي
ProductSchema.index(
  { name: 'text', richDescription: 'text', shortDescription: 'text' },
  {
    weights: { name: 5, shortDescription: 3, richDescription: 1 },
    background: true,
  },
);
ProductSchema.index(
  { merchantId: 1, slug: 1, status: 1, isAvailable: 1 },
  { background: true },
);
// فهرس فريد للـslug داخل التاجر (اختياري)
// لا تجعله فريدًا عالميًا، بل مركّبًا مع merchantId
ProductSchema.index(
  { merchantId: 1, slug: 1 },
  { unique: true, sparse: true, background: true },
);

// فهرس للفئات والحالة
ProductSchema.index(
  {
    merchantId: 1,
    category: 1,
    status: 1,
    isAvailable: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للعروض
ProductSchema.index(
  {
    merchantId: 1,
    'offer.enabled': 1,
    'offer.startAt': 1,
    'offer.endAt': 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);
ProductSchema.index(
  { merchantId: 1, source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { source: 'api', externalId: { $type: 'string' } },
    background: true,
  },
);
// فهرس للمصدر
ProductSchema.index(
  {
    merchantId: 1,
    source: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للسعر (للترتيب حسب السعر)
ProductSchema.index(
  {
    merchantId: 1,
    priceDefault: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس فريد للـ uniqueKey
ProductSchema.index(
  { uniqueKey: 1 },
  { unique: true, sparse: true, background: true },
);

// فهرس للـ slug
ProductSchema.index({ slug: 1 }, { sparse: true, background: true });

// ============ فهارس المتغيرات ============
// فهرس فريد للـ SKU داخل التاجر
ProductSchema.index(
  { merchantId: 1, 'variants.sku': 1 },
  {
    unique: true,
    sparse: true,
    background: true,
    partialFilterExpression: { hasVariants: true },
  },
);

// فهرس للـ Barcode
ProductSchema.index(
  { merchantId: 1, 'variants.barcode': 1 },
  { sparse: true, background: true },
);

// فهرس للسمات المهيكلة
ProductSchema.index(
  {
    merchantId: 1,
    'attributes.keySlug': 1,
    'attributes.valueSlugs': 1,
    status: 1,
  },
  { background: true },
);

// ============ فهارس النشر والحالة ============
// فهرس للحالة وتاريخ النشر
ProductSchema.index(
  {
    merchantId: 1,
    status: 1,
    publishedAt: -1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للنشر المؤجل
ProductSchema.index(
  {
    status: 1,
    scheduledPublishAt: 1,
  },
  {
    background: true,
    partialFilterExpression: { status: 'scheduled' },
  },
);

// ============ فهارس نوع المنتج ============
ProductSchema.index(
  {
    merchantId: 1,
    productType: 1,
    status: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للمنتجات الرقمية
ProductSchema.index(
  { merchantId: 1, productType: 1, isUnlimitedStock: 1 },
  { background: true },
);

// ============ فهارس المخزون ============
// فهرس للمخزون المنخفض
ProductSchema.index(
  { merchantId: 1, stock: 1, lowStockThreshold: 1, isUnlimitedStock: 1 },
  { background: true },
);

// فهرس للمنتجات المتاحة حسب المخزون
ProductSchema.index(
  { merchantId: 1, isAvailable: 1, stock: 1, isUnlimitedStock: 1 },
  { background: true },
);
