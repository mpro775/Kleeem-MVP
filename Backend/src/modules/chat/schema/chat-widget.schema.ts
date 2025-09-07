import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatWidgetSettingsDocument = ChatWidgetSettings & Document;

@Schema({ timestamps: true })
export class ChatWidgetSettings {
  @Prop({ required: true, index: true })
  merchantId: string;

  @Prop({ default: true }) useStorefrontBrand: boolean;

  // General
  @Prop({ default: 'Kaleem Bot' }) botName: string;
  @Prop({ default: 'ياحيا ’ كيف ممكن اساعدك اليوم؟' }) welcomeMessage: string;

  // Appearance
  @Prop({
    enum: ['default', 'gray', 'blue', 'purple', 'custom'],
    default: 'default',
  })
  theme: string;
  @Prop({ default: '#3B82F6' }) brandColor: string;
  @Prop({ default: 'Inter' }) fontFamily: string;
  @Prop({ default: '#ffffff' }) headerBgColor: string;
  @Prop({ default: '#f9fafb' }) bodyBgColor: string;

  // ↳ Leads configuration
  @Prop({ default: false })
  leadsEnabled: boolean;

  @Prop({
    type: [
      {
        fieldType: { type: String, enum: ['name', 'email', 'phone', 'custom'] },
        label: String,
        placeholder: String,
        required: Boolean,
        key: String,
      },
    ],
    default: [],
  })
  leadsFormFields: Array<{
    fieldType: 'name' | 'email' | 'phone' | 'custom';
    label: string;
    placeholder: string;
    required: boolean;
    key: string; // معرف فريد للحقل
  }>;
  @Prop({ default: false }) handoffEnabled: boolean;
  @Prop({ enum: ['slack', 'email', 'webhook'], default: 'slack' })
  handoffChannel: 'slack' | 'email' | 'webhook';
  @Prop({ type: Object, default: {} }) handoffConfig: Record<string, any>;

  // ↳ Tags
  @Prop([String]) topicsTags: string[]; // ['Pricing','Demo',…]
  @Prop([String]) sentimentTags: string[]; // ['Positive','Negative','Neutral']
  @Prop({ unique: false, index: true, sparse: true })
  widgetSlug?: string;
  @Prop({
    enum: ['bubble', 'iframe', 'bar', 'conversational'],
    default: 'bubble',
  })
  embedMode: 'bubble' | 'iframe' | 'bar' | 'conversational';
}

export const ChatWidgetSettingsSchema =
  SchemaFactory.createForClass(ChatWidgetSettings);
  ChatWidgetSettingsSchema.pre('save', async function(next) {
    try {
      const MerchantModel = this.model('Merchant');
      const m = await MerchantModel.findOne({ _id: (this as any).merchantId }).select('publicSlug') as any;
      if (m?.publicSlug) (this as any).widgetSlug = m.publicSlug; // مرآة
      next();
    } catch (e) { next(e as any); }
  });