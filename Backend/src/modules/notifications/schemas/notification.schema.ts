import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', index: true })
  merchantId?: Types.ObjectId;

  @Prop({ required: true }) // ex: catalog.sync.completed
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  body?: string;

  @Prop({ type: Object })
  data?: Record<string, unknown>;

  @Prop({ enum: ['info','success','warning','error'], default: 'info' })
  severity: 'info'|'success'|'warning'|'error';

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop()
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
