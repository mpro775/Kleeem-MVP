import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'bot_runtime_settings' })
export class BotRuntimeSettings extends Document {
  @Prop({ default: '20 أغسطس' }) launchDate!: string;
  @Prop({ default: 'https://your-landing/apply' }) applyUrl!: string;

  @Prop({ default: 'سلة، زد' }) integrationsNow!: string;
  @Prop({
    default:
      'شهر مجاني كامل، ثم باقة تجريبية محدودة وباقات مدفوعة بأسعار رمزية',
  })
  trialOffer!: string;

  @Prop({
    default: 'تكامل شركات توصيل داخل اليمن + دفع إلكتروني مناسب',
  })
  yemenNext!: string;

  @Prop({
    default:
      'يعالج فجوة خدمة العملاء بالمتاجر في اليمن ويركّز على احتياجات السوق المحلي',
  })
  yemenPositioning!: string;

  // سياسة CTA
  @Prop({ default: 3 }) ctaEvery!: number;
  @Prop({
    type: [String],
    default: [
      'ابدأ',
      'سجّل',
      'التقديم',
      'كيف أبدأ',
      'launch',
      'start',
      'apply',
      'سعر',
      'التكلفة',
      'كم السعر',
      'التكامل',
      'زد',
      'سلة',
      'اشتراك',
      'أشترك',
    ],
  })
  highIntentKeywords!: string[];

  // حارس الخصوصية
  @Prop({
    type: [String],
    default: ['اسم', 'رقم', 'هاتف', 'جوال', 'واتساب', 'ايميل', 'البريد'],
  })
  piiKeywords!: string[];
}
export const BotRuntimeSettingsSchema =
  SchemaFactory.createForClass(BotRuntimeSettings);
