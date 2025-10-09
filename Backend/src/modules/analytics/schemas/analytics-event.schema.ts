import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export type AnalyticsEventDocument = AnalyticsEvent & Document;

@Schema({ timestamps: true })
export class AnalyticsEvent {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  merchantId?: Types.ObjectId; // أصبح اختياريًّا

  @Prop({
    required: true,
    enum: [
      'http_request',
      'chat_in',
      'chat_out',
      'product_query',
      'missing_response',
      'unavailable_product',
    ],
  })
  type?: string;

  @Prop({ type: String, required: true })
  channel?: string; // e.g. 'whatsapp' | 'telegram' | 'webchat'

  @Prop({ type: mongoose.Schema.Types.Mixed, default: {} })
  payload: unknown;
}

export const AnalyticsEventSchema =
  SchemaFactory.createForClass(AnalyticsEvent);

// أضفّنا فهرسًا ثانويًا لتسريع الفرز حسب التاجر والوقت
AnalyticsEventSchema.index({ merchantId: 1, createdAt: -1 });
