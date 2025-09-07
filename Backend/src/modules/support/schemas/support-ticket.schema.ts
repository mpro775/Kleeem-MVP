import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  CONTACT_TOPIC_VALUES,
  ContactTopic,
  TICKET_STATUS_VALUES,
  TicketStatus,
} from '../support.enums';

export type SupportTicketDocument = HydratedDocument<SupportTicket>;

@Schema({ _id: false })
export class AttachmentMeta {
  @Prop({ type: String, required: true }) originalName!: string;
  @Prop({ type: String, required: true }) filename!: string;
  @Prop({ type: String, required: true }) mimeType!: string;
  @Prop({ type: Number, required: true }) size!: number;
  @Prop({ type: String }) url?: string;
  @Prop({ type: String, enum: ['disk', 'minio'], default: 'disk' }) storage!:
    | 'disk'
    | 'minio';
}
const AttachmentMetaSchema = SchemaFactory.createForClass(AttachmentMeta);

@Schema({ timestamps: true, collection: 'support_tickets' })
export class SupportTicket {
  @Prop({ type: String, required: true }) name!: string;
  @Prop({ type: String, required: true, lowercase: true, trim: true })
  email!: string;
  @Prop({ type: String }) phone?: string;

  // ✅ أهم سطر: type: String + enum: CONTACT_TOPIC_VALUES (runtime)
  @Prop({ type: String, enum: CONTACT_TOPIC_VALUES, required: true })
  topic!: ContactTopic;

  @Prop({ type: String, required: true }) subject!: string;
  @Prop({ type: String, required: true }) message!: string;

  @Prop({ type: String, enum: TICKET_STATUS_VALUES, default: 'open' })
  status!: TicketStatus;

  @Prop({ type: String, default: 'landing' }) source!: string;
  @Prop({ type: String }) ip?: string;
  @Prop({ type: String }) userAgent?: string;

  @Prop({ type: [AttachmentMetaSchema], default: [] })
  attachments!: AttachmentMeta[];

  @Prop({ type: String, index: true, unique: true })
  ticketNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', index: true })
  merchantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  createdBy?: Types.ObjectId;
}
export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ email: 1, createdAt: -1 });
