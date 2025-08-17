import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class MissingResponse {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchant: Types.ObjectId;
  @Prop({ required: true, enum: ['telegram', 'whatsapp', 'webchat'] })
  channel: string;
  @Prop({ required: true })
  question: string;
  @Prop()
  botReply: string;
  @Prop()
  sessionId?: string;
  @Prop()
  customerId?: string;

  @Prop({
    default: 'missing_response',
    enum: ['missing_response', 'unavailable_product'],
  })
  type: string;
  @Prop({ default: false })
  resolved: boolean;
  @Prop()
  manualReply?: string;
  @Prop()
  category?: string;
  @Prop()
  aiAnalysis?: string;
}

export const MissingResponseSchema =
  SchemaFactory.createForClass(MissingResponse);

// هذا هو الحل الأهم (أضف هذا السطر!)
export type MissingResponseDocument = MissingResponse & Document;
