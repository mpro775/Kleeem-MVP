// src/modules/outbox/outbox.schema.ts
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

  @Prop({ default: 'pending', index: true })
  status!: 'pending' | 'publishing' | 'published' | 'failed';

  @Prop({ default: 0 }) attempts!: number;

  // نجعلها اختيارية في التايب، والسكيما تضبط default
  @Prop({ default: () => new Date().toISOString() })
  occurredAt?: string;

  @Prop() error?: string;
  @Prop() publishedAt?: Date;
}

export const OutboxEventSchema = SchemaFactory.createForClass(OutboxEvent);
OutboxEventSchema.index({ status: 1, nextAttemptAt: 1 });
OutboxEventSchema.index({ createdAt: 1 });
