import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AdminAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  actorId!: Types.ObjectId;

  @Prop({ required: true })
  action!: string; // e.g. "suspend_merchant", "reset_password", "login"

  @Prop()
  resource?: string; // merchant | user | plan | ...

  @Prop()
  resourceId?: string;

  @Prop()
  method!: string; // GET | POST | PATCH | PUT | DELETE

  @Prop()
  path!: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop()
  ip?: string;

  @Prop()
  userAgent?: string;
}

export type AdminAuditLogDocument = AdminAuditLog & Document;
export const AdminAuditLogSchema = SchemaFactory.createForClass(AdminAuditLog);

AdminAuditLogSchema.index({ actorId: 1, createdAt: -1 });
AdminAuditLogSchema.index({ createdAt: -1 });
AdminAuditLogSchema.index({ resource: 1, resourceId: 1 });
