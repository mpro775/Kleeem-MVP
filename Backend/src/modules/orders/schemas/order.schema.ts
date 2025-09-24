// src/modules/orders/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ _id: false, timestamps: false })
export class OrderProduct {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: false })
  product?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;
}
export const OrderProductSchema = SchemaFactory.createForClass(OrderProduct);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  merchantId: string;

  @Prop({ required: true })
  sessionId: string;

  // اتركها مرنة لكن احرص أن تضيف phoneNormalized لاحقًا بالخدمة
  @Prop({ required: true, type: Object })
  customer: Record<string, unknown>;

  // ✅ استخدم الـSchema الفرعي بدل class مباشرة
  @Prop({ type: [OrderProductSchema], required: true })
  products: OrderProduct[];

  @Prop({
    default: 'pending',
    enum: ['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'],
  })
  status: string;

  @Prop()
  externalId?: string;

  @Prop({
    default: 'storefront',
    enum: ['manual', 'api', 'imported', 'mini-store', 'widget', 'storefront'],
  })
  source?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// ✅ فهارس محسّنة للـ Cursor Pagination
// فهرس أساسي للـ pagination مع merchantId
OrderSchema.index(
  {
    merchantId: 1,
    status: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للجلسة
OrderSchema.index(
  {
    sessionId: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للعميل (البحث بالهاتف)
OrderSchema.index(
  {
    'customer.phone': 1,
    merchantId: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true, sparse: true },
);

// فهرس للمصدر
OrderSchema.index(
  {
    merchantId: 1,
    source: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس فريد للـ externalId مع merchantId
OrderSchema.index(
  { merchantId: 1, externalId: 1 },
  { unique: true, sparse: true, background: true },
);
