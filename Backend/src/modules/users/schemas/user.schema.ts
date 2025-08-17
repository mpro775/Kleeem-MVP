// src/modules/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = HydratedDocument<User>;

export enum UserRole {
  MERCHANT = 'MERCHANT',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(_doc, ret) {
      ret.id = ret._id?.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password; // اخفِ كلمة السر
      return ret;
    },
  },
})
export class User {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  // لا تُرجع كلمة السر افتراضياً
  @Prop({ required: true, select: false })
  password: string;

  @Prop({ default: true })
  firstLogin: boolean;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  phone?: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.MEMBER })
  role: UserRole;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerificationCode?: string;

  @Prop()
  emailVerificationExpiresAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Merchant' })
  merchantId?: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);
UserSchema.index({ email: 1 }, { unique: true });

// هاش لكلمة المرور قبل الحفظ
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// مقارنة كلمة المرور (للاستخدام في خدمة auth)
UserSchema.methods.comparePassword = function (candidate: string) {
  // ملاحظة: بما أن password عليه select:false، عند الاستعلام استخدم .select('+password')
  return bcrypt.compare(candidate, this.password);
};
