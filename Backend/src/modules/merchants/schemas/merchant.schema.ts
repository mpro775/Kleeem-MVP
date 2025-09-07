// src/merchants/schemas/merchant.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { QuickConfig, QuickConfigSchema } from './quick-config.schema';
import { AdvancedConfig, AdvancedConfigSchema } from './advanced-config.schema';
import { WorkingHour, WorkingHourSchema } from './working-hours.schema';
import { Address, AddressSchema } from './address.schema';
import {
  SubscriptionPlan,
  SubscriptionPlanSchema,
} from './subscription-plan.schema';
function normalizeSlug(input = '') {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/g, '');
}
export interface MerchantDocument extends Merchant, Document {
  createdAt: Date;
  updatedAt: Date;
}

@Schema({ _id: false })
export class MerchantDeletionMeta {
  @Prop({ type: Date })
  requestedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  requestedBy?: Types.ObjectId;

  @Prop({ type: String })
  reason?: string;

  @Prop({ type: Date })
  forcedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  forcedBy?: Types.ObjectId;
}
export const MerchantDeletionMetaSchema =
  SchemaFactory.createForClass(MerchantDeletionMeta);

@Schema({ timestamps: true })
export class Merchant {
  // — Core fields —
  @Prop({ trim: true })
  name?: string;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  skippedChecklistItems: string[];

  @Prop({ required: false })
  logoUrl?: string;
  @Prop({ enum: ['internal', 'salla', 'zid'], default: 'internal' })
  productSource: 'internal' | 'salla' | 'zid';
  @Prop({
    type: {
      internal: { enabled: { type: Boolean, default: true } },
      salla: {
        active: { type: Boolean, default: false },
        storeId: String,
        storeUrl: String,
        lastSync: Date,
      },
      zid: {
        active: { type: Boolean, default: false },
        storeId: String,
        lastSync: Date,
      },
    },
    default: {},
  })
  productSourceConfig?: {
    internal?: { enabled: boolean };
    salla?: {
      active: boolean;
      storeId?: string;
      storeUrl?: string;
      lastSync?: Date;
    };
    zid?: { active: boolean; storeId?: string; lastSync?: Date };
  };

  @Prop({ type: [AddressSchema], default: [] })
  addresses: Address[];
  @Prop({ type: Map, of: String, default: {} })
  socialLinks?: { [key: string]: string };

  @Prop({ type: SubscriptionPlanSchema, required: true })
  subscription: SubscriptionPlan;

  @Prop({ type: [String], default: [] })
  categories: string[];

  @Prop({ required: false })
  customCategory?: string; // ← الفئة التي يضيفها التاجر بنفسه عند اختيار "أخرى"

  @Prop({ required: false })
  businessType?: string;

  @Prop({ required: false })
  businessDescription?: string;

  @Prop({ required: false })
  workflowId?: string;

  @Prop({
    type: String,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
    match: /^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$/,
  })
  publicSlug: string;

  @Prop({ type: String, trim: true })
  logoKey?: string;
  @Prop({ default: true })
  publicSlugEnabled: boolean; // للتحكم لاحقًا في إيقاف روابط slug العامة من لوحة الأدمن
  // — Prompt settings —
  @Prop({ type: QuickConfigSchema, default: () => ({}) })
  quickConfig: QuickConfig;

  @Prop({ type: AdvancedConfigSchema, default: () => ({}) })
  currentAdvancedConfig: AdvancedConfig;
  @Prop({
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  status: string;

  @Prop({ default: '' })
  phone: string;

  @Prop()
  lastActivity?: Date;
  @Prop({ type: [AdvancedConfigSchema], default: [] })
  advancedConfigHistory: AdvancedConfig[];

  @Prop({ default: '' })
  finalPromptTemplate: string;

  // — Policy documents —
  @Prop({ default: '' })
  returnPolicy: string;

  @Prop({ default: '' })
  exchangePolicy: string;

  @Prop({ default: '' })
  shippingPolicy: string;

  // إيقاف الحساب والظهور
  @Prop({ default: true, index: true })
  active: boolean;

  // ✅ تصريح صريح بالنوع مع default=null
  @Prop({ type: Date, default: null, index: true })
  deletedAt: Date | null;

  // ✅ Subdocument مُعرّف بسكيما
  @Prop({ type: MerchantDeletionMetaSchema, _id: false })
  deletion?: MerchantDeletionMeta;

  @Prop({ type: Types.ObjectId, ref: 'Storefront' })
  storefront?: Types.ObjectId;
  // — Working hours —
  @Prop({ type: [WorkingHourSchema], default: [] })
  workingHours: WorkingHour[];
}

export const MerchantSchema = SchemaFactory.createForClass(Merchant);
MerchantSchema.index({ userId: 1 }, { unique: true }); // واحد-لواحد
MerchantSchema.pre('validate', function (next) {
  const doc = this as any;

  if (doc.isNew) {
    const base = doc.publicSlug || doc.name || doc.domain || 'store';
    let normalized = normalizeSlug(base);
    // fallback إن طلع فاضي بسبب اسم عربي
    if (!normalized) {
      normalized = `s${doc._id?.toString().slice(-6) || Math.random().toString(36).slice(2, 8)}`;
    }
    doc.publicSlug = normalized;
  } else if (doc.isModified('publicSlug')) {
    doc.publicSlug = normalizeSlug(doc.publicSlug || '');
    if (!doc.publicSlug) {
      return next(new Error('سلاج غير صالح بعد التطبيع')); // يمنع التخزين بقيمة فاضية
    }
  }

  next();
});
