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

  @Prop({ type: String })
  ticketNumber!: string;

  @Prop({ type: Types.ObjectId, ref: 'Merchant', index: true })
  merchantId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  createdBy?: Types.ObjectId;
}
export const SupportTicketSchema = SchemaFactory.createForClass(SupportTicket);

// ✅ فهارس محسّنة للـ Cursor Pagination
// فهرس فريد لرقم التذكرة
SupportTicketSchema.index(
  { ticketNumber: 1 },
  { unique: true, background: true },
);

// فهرس أساسي للـ pagination
SupportTicketSchema.index(
  {
    status: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للتاجر
SupportTicketSchema.index(
  {
    merchantId: 1,
    status: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true, sparse: true },
);

// فهرس للموضوع
SupportTicketSchema.index(
  {
    topic: 1,
    status: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للبحث النصي
SupportTicketSchema.index(
  { subject: 'text', message: 'text', name: 'text' },
  {
    weights: { subject: 5, name: 3, message: 1 },
    background: true,
  },
);

// فهرس للبريد الإلكتروني
SupportTicketSchema.index(
  {
    email: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس لمنشئ التذكرة
SupportTicketSchema.index(
  {
    createdBy: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true, sparse: true },
);
