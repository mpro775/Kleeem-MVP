import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type EmailVerificationTokenDocument =
  HydratedDocument<EmailVerificationToken>;

@Schema({ collection: 'email_verification_tokens', timestamps: true })
export class EmailVerificationToken {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true, required: true })
  userId: Types.ObjectId;

  // تخزين Hash فقط للرمز
  @Prop({ required: true })
  codeHash: string;

  // TTL: حذف المستند عند وصول هذه اللحظة
  @Prop({ required: true, index: { expires: 0 } })
  expiresAt: Date;
}

export const EmailVerificationTokenSchema = SchemaFactory.createForClass(
  EmailVerificationToken,
);
