import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PasswordResetTokenDocument = HydratedDocument<PasswordResetToken>;

@Schema({ collection: 'password_reset_tokens', timestamps: true })
export class PasswordResetToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId?: Types.ObjectId;

  // نخزّن Hash فقط، وليس التوكن نفسه
  @Prop({ required: true })
  tokenHash?: string;

  // TTL: عند وصول الوقت سيُحذف المستند تلقائيًا
  @Prop({ required: true, index: { expires: 0 } })
  expiresAt?: Date;

  // لمنع الإساءة: تتبّع عدد المحاولات أو الاستخدام (اختياري)
  @Prop({ default: false })
  used?: boolean;
}

export const PasswordResetTokenSchema =
  SchemaFactory.createForClass(PasswordResetToken);
