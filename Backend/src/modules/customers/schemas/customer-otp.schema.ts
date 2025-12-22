// src/modules/customers/schemas/customer-otp.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerOtpDocument = CustomerOtp & Document;

export enum ContactType {
  PHONE = 'phone',
  EMAIL = 'email',
}

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class CustomerOtp {
  @Prop({ required: true, index: true })
  merchantId!: string;

  @Prop({ required: true })
  contact!: string; // phone or email

  @Prop({
    type: String,
    enum: [ContactType.PHONE, ContactType.EMAIL],
    required: true
  })
  contactType!: ContactType;

  @Prop({ required: true })
  codeHash!: string; // sha256 hash of the code

  @Prop({ type: String, default: null }) // للاختبار فقط، لا يخزن في الإنتاج
  code?: string;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Number, default: 0 })
  attempts!: number;

  @Prop({ type: Number, default: 5 })
  maxAttempts!: number;

  @Prop({ type: Date, default: null })
  verifiedAt?: Date;
}

export const CustomerOtpSchema = SchemaFactory.createForClass(CustomerOtp);

// TTL index للحذف التلقائي بعد انتهاء الصلاحية
CustomerOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// فهرس مركب للبحث السريع
CustomerOtpSchema.index({ merchantId: 1, contact: 1, expiresAt: -1 });
