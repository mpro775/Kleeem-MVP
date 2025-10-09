// src/modules/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { HydratedDocument, Types } from 'mongoose';

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
  versionKey: false, // يغنيك عن delete ret.__v
  toJSON: {
    virtuals: true,
    transform(_doc, ret: Record<string, unknown>) {
      ret.id = (ret._id as { toString(): string })?.toString();
      delete ret._id;
      delete ret.password;
      return ret;
    },
  },
  toObject: {
    virtuals: true, // (اختياري) لو تستخدم toObject
  },
})
export class User {
  @Prop({
    required: true,
    lowercase: true,
    trim: true,
  })
  email!: string;

  // لا تُرجع كلمة السر افتراضياً
  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ default: true })
  firstLogin!: boolean;

  @Prop({ required: true, trim: true })
  name!: string;

  @Prop()
  phone!: string;

  @Prop({ type: String, enum: UserRole, default: UserRole.MEMBER })
  role!: UserRole;

  @Prop({ default: false })
  emailVerified!: boolean;

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
  @Prop({ default: true, index: true }) active?: boolean;

  // (اختياري) دعم حذف ناعم
  @Prop()
  deletedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ✅ فهارس محسّنة للـ Cursor Pagination
// فهرس فريد للـ email
UserSchema.index({ email: 1 }, { unique: true, background: true });

// فهرس للـ pagination العام
UserSchema.index(
  {
    role: 1,
    active: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// فهرس للـ merchantId
UserSchema.index(
  {
    merchantId: 1,
    active: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true, sparse: true },
);

// فهرس للبحث النصي
UserSchema.index(
  { name: 'text', email: 'text' },
  {
    weights: { name: 3, email: 2 },
    background: true,
  },
);

// فهرس للحالة النشطة
UserSchema.index({ active: 1, createdAt: -1, _id: -1 }, { background: true });

// فهرس للتحقق من البريد الإلكتروني
UserSchema.index(
  {
    emailVerified: 1,
    createdAt: -1,
    _id: -1,
  },
  { background: true },
);

// هاش لكلمة المرور قبل الحفظ
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// مقارنة كلمة المرور (للاستخدام في خدمة auth)
UserSchema.methods.comparePassword = function (
  this: UserDocument,
  candidate: string,
) {
  // ملاحظة: بما أن password عليه select:false، عند الاستعلام استخدم .select('+password')
  return bcrypt.compare(candidate, this.password);
};
