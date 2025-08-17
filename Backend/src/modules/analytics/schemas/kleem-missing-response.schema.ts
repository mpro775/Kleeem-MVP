// src/analytics/schemas/kleem-missing-response.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'kleem_missing_responses' })
export class KleemMissingResponse {
  @Prop({ required: true, enum: ['telegram', 'whatsapp', 'webchat'] })
  channel: string;

  @Prop({ required: true })
  question: string;

  @Prop()
  botReply?: string;

  @Prop()
  sessionId?: string;

  @Prop()
  customerId?: string;

  @Prop({ default: false })
  resolved: boolean;

  @Prop()
  manualReply?: string;

  @Prop()
  category?: string;

  @Prop()
  aiAnalysis?: string;

  @Prop()
  sourceId?: string; // مثال: botId أو integrationId
}

export type KleemMissingResponseDocument = KleemMissingResponse & Document;
export const KleemMissingResponseSchema =
  SchemaFactory.createForClass(KleemMissingResponse);

// فهارس مفيدة
KleemMissingResponseSchema.index({ channel: 1, createdAt: -1 });
KleemMissingResponseSchema.index({ resolved: 1, createdAt: -1 });
KleemMissingResponseSchema.index({ sessionId: 1 });
KleemMissingResponseSchema.index({ customerId: 1 });
