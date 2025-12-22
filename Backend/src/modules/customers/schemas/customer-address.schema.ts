// src/modules/customers/schemas/customer-address.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomerAddressDocument = CustomerAddress & Document;

export enum AddressLabel {
  HOME = 'home',
  WORK = 'work',
  OTHER = 'other',
}

@Schema({ timestamps: true })
export class CustomerAddress {
  @Prop({ required: true })
  merchantId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true, index: true })
  customerId!: Types.ObjectId;

  @Prop({
    type: String,
    enum: [AddressLabel.HOME, AddressLabel.WORK, AddressLabel.OTHER],
    default: AddressLabel.OTHER
  })
  label!: AddressLabel;

  @Prop({ required: true })
  country!: string;

  @Prop({ required: true })
  city!: string;

  @Prop({ required: true })
  address1!: string;

  @Prop()
  address2?: string;

  @Prop()
  zip?: string;

  @Prop({ type: Boolean, default: false })
  isDefault!: boolean;
}

export const CustomerAddressSchema = SchemaFactory.createForClass(CustomerAddress);

// فهرس للبحث عن عناوين العميل
CustomerAddressSchema.index({ customerId: 1, isDefault: -1 });

// فهرس مركب مع merchantId للأمان
CustomerAddressSchema.index({ merchantId: 1, customerId: 1 });
