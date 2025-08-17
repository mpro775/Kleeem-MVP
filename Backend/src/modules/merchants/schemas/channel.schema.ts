import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class ChannelConfig {
  @Prop({ default: false })
  enabled: boolean;

  @Prop()
  phone?: string; // للواتساب

  @Prop()
  sessionId?: string;
  @Prop()
  instanceId?: string;
  @Prop()
  qr?: string; // base64 QR

  @Prop()
  status?: string;
  @Prop()
  token?: string; // للتليجرام

  @Prop()
  chatId?: string; // للتليجرام
  @Prop()
  webhookUrl?: string;

  @Prop({ type: Object, default: {} })
  widgetSettings?: Record<string, any>; // للويبشات
}

export type ChannelConfigDocument = ChannelConfig & Document;
export const ChannelConfigSchema = SchemaFactory.createForClass(ChannelConfig);
