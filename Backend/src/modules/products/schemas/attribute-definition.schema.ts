// src/modules/products/schemas/attribute-definition.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AttributeDefinitionDocument = HydratedDocument<AttributeDefinition>;

export type AttributeType = 'list' | 'text' | 'number' | 'boolean';
export type AttributeStatus = 'active' | 'archived';

@Schema({ _id: false })
export class AttributeAllowedValue {
  @Prop({ required: true, trim: true, lowercase: true })
  valueSlug!: string;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({ type: Object, default: undefined })
  meta?: Record<string, unknown>;
}

const AttributeAllowedValueSchema = SchemaFactory.createForClass(
  AttributeAllowedValue,
);

@Schema({ timestamps: true })
export class AttributeDefinition {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId!: Types.ObjectId;

  @Prop({ required: true, trim: true, lowercase: true })
  keySlug!: string;

  @Prop({ required: true, trim: true })
  label!: string;

  @Prop({
    type: String,
    enum: ['list', 'text', 'number', 'boolean'],
    default: 'list',
  })
  type!: AttributeType;

  @Prop({
    type: [AttributeAllowedValueSchema],
    _id: false,
    default: [],
  })
  allowedValues?: AttributeAllowedValue[];

  @Prop({ type: Boolean, default: false })
  isVariantDimension?: boolean;

  @Prop({
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
    index: true,
  })
  status?: AttributeStatus;
}

export const AttributeDefinitionSchema =
  SchemaFactory.createForClass(AttributeDefinition);

AttributeDefinitionSchema.index(
  { merchantId: 1, keySlug: 1 },
  { unique: true, background: true },
);
