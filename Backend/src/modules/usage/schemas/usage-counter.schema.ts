// src/modules/usage/schemas/usage-counter.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UsageCounterDocument = UsageCounter & Document;

@Schema({ timestamps: true, versionKey: false })
export class UsageCounter {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId: Types.ObjectId;

  // مفتاح الشهر بالصيغة YYYY-MM (حسب Asia/Aden)
  @Prop({ required: true, index: true })
  monthKey: string;

  @Prop({ default: 0, min: 0 })
  messagesUsed: number;
}

export const UsageCounterSchema = SchemaFactory.createForClass(UsageCounter);
// فهرس فريد لمنع تعدد السجلات لنفس التاجر/الشهر
UsageCounterSchema.index({ merchantId: 1, monthKey: 1 }, { unique: true });
