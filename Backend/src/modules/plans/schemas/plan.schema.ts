// schemas/plan.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
export type PlanDocument = Plan & Document;

@Schema({ timestamps: true, versionKey: false })
export class Plan {
  @Prop({ required: true, unique: true, trim: true, index: true })
  name: string;

  @Prop({ required: true, min: 0 })
  priceCents: number;

  @Prop({ required: true, enum: ['USD', 'SAR', 'AED', 'YER'], default: 'USD' })
  currency: string;

  @Prop({ required: true, min: 1 })
  durationDays: number;

  @Prop({ default: 100, min: 0 })
  messageLimit?: number;

  @Prop({ default: true })
  llmEnabled?: boolean;

  @Prop({ default: false, index: true })
  isTrial?: boolean;

  @Prop({ default: true, index: true })
  isActive?: boolean;

  @Prop() description?: string;

  @Prop({ type: [String], default: [] })
  features?: string[];

  @Prop({ enum: ['monthly', 'annual'], default: 'monthly' })
  billingPeriod?: 'monthly' | 'annual';

  @Prop({ default: 0, min: 0 })
  trialPeriodDays?: number;

  @Prop({ default: false, index: true })
  archived?: boolean;
}
export const PlanSchema = SchemaFactory.createForClass(Plan);

// ✅ فهارس محسّنة للـ Cursor Pagination
// فهرس فريد للاسم
PlanSchema.index({ name: 1 }, { unique: true, background: true });

// فهرس للحالة النشطة
PlanSchema.index(
  {
    isActive: 1,
    archived: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للتجربة المجانية
PlanSchema.index(
  {
    isTrial: 1,
    isActive: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للعملة وفترة الفوترة
PlanSchema.index(
  {
    currency: 1,
    billingPeriod: 1,
    isActive: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للسعر
PlanSchema.index(
  {
    priceCents: 1,
    currency: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);
