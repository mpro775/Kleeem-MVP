// src/modules/knowledge/schemas/source-url.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SourceUrl extends Document {
  @Prop({ required: true }) merchantId?: string;
  @Prop({ required: true }) url?: string;
  @Prop({ default: 'pending' }) status?: string; // pending | completed | failed
  @Prop() errorMessage?: string;
  @Prop() textExtracted?: string; // اختياري لتسهيل المراجعة اليدوية
}

export const SourceUrlSchema = SchemaFactory.createForClass(SourceUrl);
SourceUrlSchema.index({ merchantId: 1, url: 1 }, { unique: true });
