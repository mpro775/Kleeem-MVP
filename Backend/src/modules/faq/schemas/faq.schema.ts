// src/modules/faq/schemas/faq.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Faq extends Document {
  @Prop({ required: true })
  merchantId: string;

  @Prop({ required: true })
  question: string;

  @Prop({ required: true })
  answer: string;

  @Prop({ default: 'active' })
  status: string; // active, archived, deleted ...
}

export const FaqSchema = SchemaFactory.createForClass(Faq);
