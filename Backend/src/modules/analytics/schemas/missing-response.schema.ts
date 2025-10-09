import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MissingResponseDocument = HydratedDocument<MissingResponse>;

@Schema({ timestamps: true, collection: 'missing_responses' })
export class MissingResponse {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchant?: Types.ObjectId;

  @Prop({ enum: ['telegram', 'whatsapp', 'webchat'], required: true })
  channel?: 'telegram' | 'whatsapp' | 'webchat';

  @Prop({ required: true }) question?: string;
  @Prop({ required: true }) botReply?: string;

  @Prop() sessionId?: string;
  @Prop() aiAnalysis?: string;
  @Prop() customerId?: string;

  @Prop({
    enum: ['missing_response', 'unavailable_product'],
    default: 'missing_response',
  })
  type?: 'missing_response' | 'unavailable_product';

  @Prop({ default: false, index: true })
  resolved?: boolean;

  @Prop() resolvedAt?: Date;
  @Prop() resolvedBy?: string; // userId أو الإيميل الذي أنهى المهمة
}

export const MissingResponseSchema =
  SchemaFactory.createForClass(MissingResponse);

MissingResponseSchema.index({ merchant: 1, createdAt: -1 });
MissingResponseSchema.index({ merchant: 1, resolved: 1, createdAt: -1 });
MissingResponseSchema.index({ merchant: 1, channel: 1, createdAt: -1 });
MissingResponseSchema.index({ merchant: 1, type: 1, createdAt: -1 });
