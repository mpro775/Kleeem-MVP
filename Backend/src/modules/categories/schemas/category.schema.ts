// category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null })
  parent?: Types.ObjectId | null; // لدعم التداخل (Sub-categories)

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: '' })
  image?: string;

  @Prop({ default: [] })
  keywords?: string[];
}

export const CategorySchema = SchemaFactory.createForClass(Category);
