// src/modules/kleem/botChats/schemas/botChat.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type KleemRole = 'user' | 'bot';

@Schema({ _id: false })
export class BotSingleMessage {
  @Prop({ type: String, enum: ['user', 'bot'], required: true })
  role!: KleemRole;

  @Prop({ type: String, required: true })
  text!: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  @Prop({ type: Date, default: Date.now })
  timestamp?: Date;

  @Prop({ type: Number, enum: [0, 1, null], default: null })
  rating?: 0 | 1 | null;

  @Prop({ type: String, default: null })
  feedback?: string | null;
}

@Schema({ timestamps: true })
export class BotChatSession extends Document {
  @Prop({ required: true })
  sessionId!: string;

  @Prop({ type: [BotSingleMessage], default: [] })
  messages!: BotSingleMessage[];
}

export const BotChatSessionSchema =
  SchemaFactory.createForClass(BotChatSession);

// فهارس مفيدة
BotChatSessionSchema.index({ sessionId: 1 }, { unique: true });
BotChatSessionSchema.index({ updatedAt: -1 });
