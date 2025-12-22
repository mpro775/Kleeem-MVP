// src/modules/customers/schemas/customer.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerDocument = Customer & Document;

export enum SignupSource {
  OTP = 'otp',
  ORDER = 'order',
  LEAD = 'lead',
  MANUAL = 'manual',
}

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true, index: true })
  merchantId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ lowercase: true, sparse: true, index: { unique: true, sparse: true } })
  emailLower?: string;

  @Prop({ sparse: true, index: { unique: true, sparse: true } })
  phoneNormalized?: string;

  @Prop({ type: Boolean, default: false })
  marketingConsent!: boolean;

  @Prop({ type: Boolean, default: false })
  isBlocked!: boolean;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: Object, default: {} })
  metadata!: Record<string, unknown>;

  @Prop({ type: Date, default: null })
  lastSeenAt?: Date;

  @Prop({
    type: String,
    enum: [SignupSource.OTP, SignupSource.ORDER, SignupSource.LEAD, SignupSource.MANUAL],
    default: SignupSource.MANUAL
  })
  signupSource!: SignupSource;

  @Prop({
    type: {
      totalOrders: { type: Number, default: 0 },
      totalSpend: { type: Number, default: 0 },
      lastOrderId: { type: Types.ObjectId, ref: 'Order', default: null },
    },
    _id: false,
  })
  stats!: {
    totalOrders: number;
    totalSpend: number;
    lastOrderId: Types.ObjectId | null;
  };
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

// فهارس إضافية
CustomerSchema.index({ merchantId: 1, createdAt: -1 });
CustomerSchema.index({ merchantId: 1, name: 'text' }); // للبحث النصي بالاسم
