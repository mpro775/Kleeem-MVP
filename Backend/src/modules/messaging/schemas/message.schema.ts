// ---------------------------
// File: src/modules/messaging/schemas/message.schema.ts
// ---------------------------
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageSessionDocument = HydratedDocument<MessageSession>;
@Schema()
export class SingleMessage {
  @Prop()
  _id?: Types.ObjectId;
  @Prop({ type: String, enum: ['customer', 'bot', 'agent'], required: true })
  role: string;
  @Prop({ type: String, required: true })
  text: string;
  @Prop({ type: Date, required: true })
  timestamp: Date;
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
  @Prop({ type: [String], default: [] })
  keywords?: string[];
  @Prop({ type: Number, enum: [1, 0, null], default: null })
  rating?: number | null;
  @Prop({ type: String, default: null })
  feedback?: string | null;
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  ratedBy?: Types.ObjectId | null;
  @Prop({ type: Date, default: null })
  ratedAt?: Date | null;
}

@Schema({ timestamps: true })
export class MessageSession {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId: Types.ObjectId;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ required: true, enum: ['whatsapp', 'telegram', 'webchat'] })
  channel: string;
  @Prop({ type: Boolean, default: false })
  handoverToAgent: boolean;
  @Prop({
    type: [SingleMessage],
    default: [],
  })
  messages: SingleMessage[];
}

export const MessageSessionSchema =
  SchemaFactory.createForClass(MessageSession);
