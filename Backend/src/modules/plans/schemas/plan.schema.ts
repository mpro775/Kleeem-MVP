import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlanDocument = Plan & Document;

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number; // قيمة الاشتراك
  @Prop({ default: 100 }) messageLimit?: number; // عدد الرسائل الشهرية
  @Prop({ default: true }) llmEnabled?: boolean; // هل يُسمح باستخدام الذكاء الاصطناعي
  @Prop({ default: false }) isTrial?: boolean; // هل هذه الخطة مجانية تجريبية
  @Prop({ default: true }) isActive?: boolean; // هل الخطة مفعّلة حاليًا
  @Prop() description?: string; // وصف اختياري للخطة
  @Prop({ required: true })
  duration: number; // بالأيام
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
