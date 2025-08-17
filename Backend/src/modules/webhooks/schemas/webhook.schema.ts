import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WebhookDocument = Webhook & Document;

@Schema()
export class Webhook {
  @Prop({ required: true })
  eventType: string;

  @Prop({ required: true })
  payload: string;

  @Prop({ default: Date.now })
  receivedAt: Date;
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);
