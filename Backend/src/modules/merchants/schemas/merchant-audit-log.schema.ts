import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MerchantAuditAction =
  | 'suspend'
  | 'unsuspend'
  | 'update_admin'
  | 'soft_delete'
  | 'restore'
  | 'purge'
  | 'usage_reset';

@Schema({ timestamps: true })
export class MerchantAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: true, index: true })
  merchantId!: Types.ObjectId;

  @Prop({ required: true })
  action!: MerchantAuditAction;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  actorId!: Types.ObjectId;

  @Prop()
  reason?: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export type MerchantAuditLogDocument = MerchantAuditLog & Document;
export const MerchantAuditLogSchema =
  SchemaFactory.createForClass(MerchantAuditLog);

MerchantAuditLogSchema.index({ merchantId: 1, createdAt: -1 });
