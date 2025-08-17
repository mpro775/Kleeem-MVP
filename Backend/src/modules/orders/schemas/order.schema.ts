// src/modules/orders/schemas/order.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class OrderProduct {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: false }) // productId قد لا يكون متاح دائمًا
  product?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  merchantId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true, type: Object })
  customer: Record<string, any>;

  @Prop({ type: [OrderProduct], required: true })
  products: OrderProduct[];

  
  
  @Prop({
    default: 'pending',
    enum: ['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'],
  })
  status: string;

  @Prop()
  externalId?: string;

  @Prop({ default: 'manual', enum: ['manual', 'api', 'imported'] })
  source?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index(
  { merchantId: 1, externalId: 1 },
  { unique: true, sparse: true },
);
