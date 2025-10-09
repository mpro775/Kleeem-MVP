import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UnavailableProductDocument = UnavailableProduct & Document;

@Schema({ timestamps: true })
export class UnavailableProduct {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant?: Types.ObjectId;

  @Prop({ required: true, enum: ['telegram', 'whatsapp', 'webchat'] })
  channel?: string;

  @Prop({ required: true })
  productName?: string; // اسم المنتج المطلوب

  @Prop() // نص سؤال العميل
  question?: string;

  @Prop() // الرد الآلي (غالباً اعتذار أو نص مخصص)
  botReply?: string;

  @Prop()
  sessionId?: string;

  @Prop()
  customerId?: string;

  @Prop({ type: Object })
  context?: Array<{ role: string; text: string }>;

  @Prop({ default: false })
  resolved?: boolean;

  @Prop()
  manualReply?: string;

  @Prop() // تصنيف إضافي
  category?: string;
}

export const UnavailableProductSchema =
  SchemaFactory.createForClass(UnavailableProduct);
