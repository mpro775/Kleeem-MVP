// src/merchants/schemas/address.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class Address {
  @Prop({ default: '' })
  street!: string;

  @Prop({ default: '' })
  city!: string;

  @Prop({ default: '' })
  state?: string;

  @Prop({ default: '' })
  postalCode?: string;

  @Prop({ default: '' })
  country!: string;
}

export type AddressDocument = Address & Document;
export const AddressSchema = SchemaFactory.createForClass(Address);
