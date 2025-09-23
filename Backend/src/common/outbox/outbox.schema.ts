import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ timestamps: true, collection: 'outbox_events' })
export class OutboxEvent {
  @Prop({ required: true }) aggregateType!: string;
  @Prop({ required: true }) aggregateId!: string;

  @Prop({ required: true }) eventType!: string;

  // Mixed لتفادي مشاكل validation مع payloads مختلفة
  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  payload!: Record<string, unknown>;

  @Prop({ required: true }) exchange!: string;
  @Prop({ required: true }) routingKey!: string;

  // states: pending -> publishing -> published
  @Prop({ default: 'pending', enum: ['pending', 'publishing', 'published'] })
  status!: 'pending' | 'publishing' | 'published';

  @Prop({ default: 0 }) attempts!: number;

  // للـ backoff والجدولة
  @Prop({ type: Date, default: () => new Date(0) })
  nextAttemptAt!: Date;

  // قفل ناعم لمنع السحب المزدوج
  @Prop() lockedBy?: string;
  @Prop({ type: Date }) lockedAt?: Date;

  // اجعلها Date لسهولة التحليل
  @Prop({ type: Date, default: () => new Date() })
  occurredAt?: Date;

  @Prop() error?: string;
  @Prop({ type: Date }) publishedAt?: Date;

  // اختياري لإزالة التكرار عبر المنتج/العملية
  @Prop() dedupeKey?: string;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);

// للاسترجاع: pending حسب أقدمية/استحقاق التنفيذ
OutboxEventSchema.index({ status: 1, nextAttemptAt: 1 }, { background: true });

// للفرز بالزمن
OutboxEventSchema.index({ createdAt: 1 }, { background: true });

// للتعافي من التعليق publishing عبر lockedAt
OutboxEventSchema.index({ status: 1, lockedAt: 1 }, { background: true });

// dedupeKey فريد مع sparse (لن يفرض uniqueness عندما لا يوجد المفتاح)
OutboxEventSchema.index(
  { dedupeKey: 1 },
  { unique: true, sparse: true, background: true },
);

// TTL لتنظيف الأحداث المنشورة القديمة (7 أيام مثلاً)
OutboxEventSchema.index(
  { publishedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60, background: true },
);
