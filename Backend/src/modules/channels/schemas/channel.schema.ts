// src/modules/channels/schemas/channel.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChannelDocument = Channel & Document;

export enum ChannelStatus {
  DISCONNECTED = 'disconnected',
  PENDING = 'pending',
  CONNECTED = 'connected',
  ERROR = 'error',
  REVOKED = 'revoked',
  THROTTLED = 'throttled',
}

export enum ChannelProvider {
  TELEGRAM = 'telegram',
  WHATSAPP_CLOUD = 'whatsapp_cloud',
  WHATSAPP_QR = 'whatsapp_qr',
  INSTAGRAM = 'instagram',
  MESSENGER = 'messenger',
  WEBCHAT = 'webchat',
  EMAIL = 'email',
  SMS = 'sms',
}

@Schema({ timestamps: true })
export class Channel {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', index: true, required: true })
  merchantId!: Types.ObjectId;

  @Prop({ enum: ChannelProvider, required: true, index: true })
  provider!: ChannelProvider;

  @Prop({ default: false })
  enabled!: boolean;

  @Prop({
    enum: ChannelStatus,
    default: ChannelStatus.DISCONNECTED,
    index: true,
  })
  status!: ChannelStatus;

  @Prop() accountLabel?: string;
  @Prop() webhookUrl?: string;
  @Prop() secretHash?: string; // للتحقق من الويبهوك (hash)

  // OAuth / أسرار (خزّنها مشفّرة)
  @Prop() accessTokenEnc?: string;
  @Prop() refreshTokenEnc?: string;
  @Prop() expiresAt?: Date;
  @Prop({ type: [String], default: [] }) scopes?: string[];

  // WhatsApp Cloud
  @Prop() phoneNumberId?: string;
  @Prop() wabaId?: string;
  @Prop() appSecretEnc?: string; // توقيع فيسبوك
  @Prop() verifyTokenHash?: string; // توكن التحقق (hash)

  // WhatsApp QR (Evolution)
  @Prop() sessionId?: string;
  @Prop() instanceId?: string;
  @Prop() qr?: string;

  // Telegram
  @Prop() botTokenEnc?: string;
  @Prop() username?: string;
  @Prop() defaultChatId?: string;

  // Instagram/Messenger
  @Prop() pageId?: string;
  @Prop() igBusinessId?: string;

  // Webchat
  @Prop({ type: Object, default: {} }) widgetSettings?: Record<string, unknown>;

  @Prop({ default: false }) isDefault?: boolean;
  @Prop({ default: null }) deletedAt?: Date;
}

export const ChannelSchema = SchemaFactory.createForClass(Channel);
ChannelSchema.index({ merchantId: 1, provider: 1, status: 1 });
ChannelSchema.index(
  { merchantId: 1, provider: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true, deletedAt: null },
  },
);
ChannelSchema.index({ merchantId: 1, provider: 1, deletedAt: 1 });

// لا تُرجِع الأسرار في JSON
ChannelSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.accessTokenEnc;
    delete ret.refreshTokenEnc;
    delete ret.appSecretEnc;
    delete ret.verifyTokenHash;
    delete ret.secretHash;
    return ret;
  },
});
