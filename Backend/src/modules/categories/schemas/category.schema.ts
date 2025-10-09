// src/modules/categories/schemas/category.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import slugify from 'slugify';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true })
  name!: string;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Category', default: null, index: true })
  parent!: Types.ObjectId | null;

  @Prop({ default: '' })
  description!: string;

  @Prop({ default: '' })
  image!: string;

  @Prop({ default: [] })
  keywords?: string[];

  // جديد:
  @Prop({ required: true })
  slug?: string; // فريد بين الإخوة

  @Prop({ default: '' })
  path?: string; // مثل: "electronics/phones/android"

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
  ancestors?: Types.ObjectId[]; // [rootId, parentId, ...]

  @Prop({ default: 0 })
  depth?: number; // ancestors.length

  @Prop({ default: 0 })
  order?: number; // ترتيب الإخوة
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// ✅ فهارس محسّنة للـ Cursor Pagination
// فهرس أساسي للـ pagination مع merchantId
CategorySchema.index(
  {
    merchantId: 1,
    parent: 1,
    order: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس فريد للـ slug ضمن نفس الـ merchant والـ parent
CategorySchema.index(
  { merchantId: 1, parent: 1, slug: 1 },
  { unique: true, background: true },
);

// فهرس للبحث النصي
CategorySchema.index(
  { name: 'text', description: 'text' },
  {
    weights: { name: 5, description: 1 },
    background: true,
  },
);

// فهرس للـ path للبحث الهرمي
CategorySchema.index(
  {
    merchantId: 1,
    path: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للعمق
CategorySchema.index(
  {
    merchantId: 1,
    depth: 1,
    order: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للأجداد
CategorySchema.index(
  {
    merchantId: 1,
    ancestors: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// مولّد slug تلقائيًا إن لم يُمرّر
CategorySchema.pre('validate', function (next) {
  const doc = this as unknown as CategoryDocument;
  if (!doc.slug) {
    doc.slug = slugify(doc.name ?? '', {
      lower: true,
      strict: true,
      locale: 'ar',
    });
  }
  next();
});
