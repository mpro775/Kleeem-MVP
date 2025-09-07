// src/modules/categories/schemas/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import slugify from 'slugify';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parent?: Types.ObjectId | null;

  @Prop({ default: '' })
  description?: string;

  @Prop({ default: '' })
  image?: string;

  @Prop({ default: [] })
  keywords?: string[];

  // جديد:
  @Prop({ required: true })
  slug: string; // فريد بين الإخوة

  @Prop({ default: '' })
  path: string; // مثل: "electronics/phones/android"

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  ancestors: Types.ObjectId[]; // [rootId, parentId, ...]

  @Prop({ default: 0 })
  depth: number; // ancestors.length

  @Prop({ default: 0 })
  order: number; // ترتيب الإخوة
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// فهارس مهمّة
CategorySchema.index(
  { merchantId: 1, parent: 1, slug: 1 },
  { unique: true, name: 'uniq_sibling_slug' },
);
CategorySchema.index({ merchantId: 1, path: 1 });
CategorySchema.index({ merchantId: 1, ancestors: 1 });
CategorySchema.index({ merchantId: 1, depth: 1 });

// مولّد slug تلقائيًا إن لم يُمرّر
CategorySchema.pre('validate', function (next) {
  const doc = this as unknown as CategoryDocument;
  if (!doc.slug) {
    doc.slug = slugify(doc.name, { lower: true, strict: true, locale: 'ar' });
  }
  next();
});
