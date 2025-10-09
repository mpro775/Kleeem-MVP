// src/modules/webhooks/schemas/incoming-event.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class IncomingEvent {
  @Prop({ required: true }) merchantId!: string;
  @Prop({ required: true }) channel!: string; // whatsapp|telegram|webchat
  @Prop({ required: true }) platformMessageId!: string; // message_id | key.id
  @Prop() sessionId!: string;
}

export type IncomingEventDocument = IncomingEvent & Document;
export const IncomingEventSchema = SchemaFactory.createForClass(IncomingEvent);
IncomingEventSchema.index(
  { merchantId: 1, channel: 1, platformMessageId: 1 },
  { unique: true },
);
