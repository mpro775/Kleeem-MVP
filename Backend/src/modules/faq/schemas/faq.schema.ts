// src/modules/faq/schemas/faq.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Faq extends Document {
  @Prop({ required: true }) merchantId: string;
  @Prop({ required: true }) question: string;
  @Prop({ required: true }) answer: string;

  // pending أثناء التضمين، completed بعد نجاح الحفظ في Qdrant، failed عند الخطأ، deleted للحذف الناعم
  @Prop({ default: 'pending' })
  status: 'pending' | 'completed' | 'failed' | 'deleted';

  @Prop() errorMessage?: string;
}

export const FaqSchema = SchemaFactory.createForClass(Faq);

// فهارس مفيدة
FaqSchema.index({ merchantId: 1, status: 1, createdAt: -1 });
