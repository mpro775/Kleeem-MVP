import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, index: true })
  merchantId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ type: Object, required: true })
  data: Record<string, unknown>; // البيانات المرسلة من المستخدم

  @Prop()
  source?: string; // optional: من أين أتت الـ lead (widget, iframe)
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
