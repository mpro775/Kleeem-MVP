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

  // ======== أسرار/توكنات (عام) — قديمة (للتوافق الخلفي) ========
  @Prop() accessToken?: string;
  @Prop() refreshToken?: string;
  @Prop() tokenType?: string;
  @Prop() expiresIn?: number;
  @Prop() expiresAt?: Date;

  // ======== توكنات ZID الحديثة (مفصولة) ========
  // X-Manager-Token / Access-Token
  @Prop() managerToken?: string;
  // جاهز للاستخدام كترويسة Authorization (إن كنت تحفظه)
  @Prop() authorizationToken?: string;

  // متجر خارجي
  @Prop() storeId?: string;
  @Prop() storeUrl?: string;

  @Prop([String]) scopes?: string[];
  @Prop() lastSync?: Date;
}

export const IntegrationSchema = SchemaFactory.createForClass(Integration);
IntegrationSchema.index({ merchantId: 1, provider: 1 }, { unique: true });

// إخفاء الحقول الحساسة في المخرجات
IntegrationSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.accessToken;
    delete ret.refreshToken;
    delete ret.managerToken;
    delete ret.authorizationToken;
    return ret;
  },
});
