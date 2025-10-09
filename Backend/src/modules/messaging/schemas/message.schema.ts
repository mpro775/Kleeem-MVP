// src/modules/messaging/schemas/message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MessageSessionDocument = HydratedDocument<MessageSession>;

@Schema({ _id: false }) // هذا كـ "class schema", سنعرّف _id للحقل نفسه
export class SingleMessage {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id!: Types.ObjectId;

  @Prop({ type: String, enum: ['customer', 'bot', 'agent'], required: true })
  role?: 'customer' | 'bot' | 'agent';

  @Prop({ type: String, required: true })
  text?: string;

  @Prop({ type: Date, required: true })
  timestamp?: Date;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  keywords?: string[];

  @Prop({ type: Number, enum: [1, 0, null], default: null })
  rating?: 1 | 0;

  @Prop({ type: String, default: null })
  feedback?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  ratedBy?: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  ratedAt?: Date | null;
}

export const SingleMessageSchema = SchemaFactory.createForClass(SingleMessage);

@Schema({ timestamps: true })
export class MessageSession {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true })
  merchantId?: Types.ObjectId;

  @Prop({ required: true })
  sessionId?: string;

  @Prop({ type: String, enum: ['api', 'qr'], default: null })
  transport?: 'api' | 'qr';

  @Prop({ required: true, enum: ['whatsapp', 'telegram', 'webchat'] })
  channel?: 'whatsapp' | 'telegram' | 'webchat';

  @Prop({ type: Boolean, default: false })
  handoverToAgent?: boolean;

  // IMPORTANT: استخدم السكيمة الفرعية هنا
  @Prop({ type: [SingleMessageSchema], default: [] })
  messages?: SingleMessage[];
}

export const MessageSessionSchema =
  SchemaFactory.createForClass(MessageSession);
MessageSessionSchema.index(
  { merchantId: 1, channel: 1, sessionId: 1 },
  { unique: true, name: 'uniq_merchant_channel_session' },
);
MessageSessionSchema.index({ createdAt: -1 });
