// src/modules/kleem/botFaq/schemas/botFaq.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BotFaq extends Document {
  @Prop({ required: true, trim: true })
  question: string;

  @Prop({ required: true, trim: true })
  answer: string;

  @Prop({ default: 'active', enum: ['active', 'deleted'], index: true })
  status: 'active' | 'deleted';

  @Prop({
    default: 'manual',
    enum: ['manual', 'auto', 'imported'],
    index: true,
  })
  source: 'manual' | 'auto' | 'imported';

  @Prop({ type: [String], default: [], index: true })
  tags?: string[];

  @Prop({ type: String, default: 'ar', enum: ['ar', 'en'], index: true })
  locale?: 'ar' | 'en';

  @Prop({
    type: String,
    default: 'pending',
    enum: ['pending', 'ok', 'failed'],
    index: true,
  })
  vectorStatus?: 'pending' | 'ok' | 'failed';

  @Prop({ type: String })
  createdBy?: string; // userId (اختياري)
}
export const BotFaqSchema = SchemaFactory.createForClass(BotFaq);
BotFaqSchema.index({ status: 1, updatedAt: -1 });
