// src/integrations/schemas/integration.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type IntegrationDocument = Integration & Document;

@Schema({ timestamps: true })
export class Integration {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', index: true, required: true })
  merchantId: Types.ObjectId;

  @Prop({ enum: ['salla', 'zid'], required: true, index: true })
  provider: 'salla' | 'zid';

  @Prop({ default: false }) active: boolean;

  // أسرار/توكنات
  @Prop() accessToken?: string;
  @Prop() refreshToken?: string;
  @Prop() tokenType?: string;
  @Prop() expiresIn?: number;
  @Prop() expiresAt?: Date;

  // متجر خارجي
  @Prop() storeId?: string;
  @Prop() storeUrl?: string;

  @Prop() scopes?: string[];
  @Prop() lastSync?: Date;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);
IntegrationSchema.index({ merchantId: 1, provider: 1 }, { unique: true });
