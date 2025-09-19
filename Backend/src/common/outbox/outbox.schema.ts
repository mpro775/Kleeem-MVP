import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OutboxEventDocument = HydratedDocument<OutboxEvent>;

@Schema({ timestamps: true, collection: 'outbox_events' })
export class OutboxEvent {
  @Prop({ required: true }) aggregateType!: string;
  @Prop({ required: true }) aggregateId!: string;

  @Prop({ required: true }) eventType!: string;
  @Prop({ type: Object, required: true }) payload!: Record<string, any>;

  @Prop({ required: true }) exchange!: string;
  @Prop({ required: true }) routingKey!: string;

  // states: pending -> publishing -> published
  @Prop({ default: 'pending', index: true })
  status!: 'pending' | 'publishing' | 'published';

  @Prop({ default: 0 }) attempts!: number;

  // للـ backoff والجدولة
  @Prop({ default: () => new Date(0) })
  nextAttemptAt!: Date;

  // قفل ناعم لمنع السحب المزدوج
  @Prop() lockedBy?: string;
  @Prop() lockedAt?: Date;

  @Prop({ default: () => new Date().toISOString() })
  occurredAt?: string;

  @Prop() error?: string;
  @Prop() publishedAt?: Date;

  // اختياري لإزالة التكرار عبر المنتج/العملية
  @Prop() dedupeKey?: string;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ status: 1, nextAttemptAt: 1 });
OutboxEventSchema.index({ createdAt: 1 });
OutboxEventSchema.index({ dedupeKey: 1 }, { unique: false, sparse: true });
