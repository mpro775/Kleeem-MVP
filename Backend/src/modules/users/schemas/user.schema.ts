// src/modules/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type UserDocument = HydratedDocument<User>;

export interface NotificationsChannels {
  inApp: boolean;
  email: boolean;
  telegram?: boolean;
  whatsapp?: boolean;
}
export type MissingResponsesDigest = 'off' | 'daily' | 'weekly';

export interface NotificationsTopics {
  syncFailed: boolean;
  syncCompleted: boolean;
  webhookFailed: boolean;
  embeddingsCompleted: boolean;
  missingResponsesDigest: MissingResponsesDigest;
}

export interface QuietHours {
  enabled: boolean;
  start?: string; // "22:00"
  end?: string; // "08:00"
  timezone?: string; // "Asia/Aden"
}

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

  @Prop()
  passwordChangedAt?: Date;
  // ⬇️ جديد: تفضيلات الإشعارات
  @Prop({
    type: {
      channels: {
        inApp: { type: Boolean, default: true },
        email: { type: Boolean, default: true },
        telegram: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false },
      },
      topics: {
        syncFailed: { type: Boolean, default: true },
        syncCompleted: { type: Boolean, default: true },
        webhookFailed: { type: Boolean, default: true },
        embeddingsCompleted: { type: Boolean, default: true },
        missingResponsesDigest: {
          type: String,
          enum: ['off', 'daily', 'weekly'],
          default: 'daily',
        },
      },
      quietHours: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: '22:00' },
        end: { type: String, default: '08:00' },
        timezone: { type: String, default: 'Asia/Aden' },
      },
    },
    default: {},
  })
  notificationsPrefs?: {
    channels: NotificationsChannels;
    topics: NotificationsTopics;
    quietHours: QuietHours;
  };
  @Prop({ default: true, index: true }) active: boolean;

  // (اختياري) دعم حذف ناعم
  @Prop()
  deletedAt?: Date;
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
