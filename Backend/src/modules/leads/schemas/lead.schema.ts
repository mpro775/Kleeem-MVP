// src/modules/leads/schemas/lead.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LeadDocument = Lead & Document;

@Schema({ timestamps: true })
export class Lead {
  @Prop({ required: true, index: true })
  merchantId: string;

  @Prop({ required: true })
  sessionId: string;

  @Prop({ type: Object, required: true })
  data: Record<string, any>;

  @Prop()
  source?: string;
}

export const LeadSchema = SchemaFactory.createForClass(Lead);
