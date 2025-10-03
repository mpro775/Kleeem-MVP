// src/waitlist/schemas/waitlist-lead.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class WaitlistLead extends Document {
  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop() name?: string;
  @Prop() phone?: string;

  @Prop({ required: true, enum: ['yes', 'no'] })
  hasStore: 'yes' | 'no';

  @Prop({
    required: true,
    enum: ['Salla', 'Zid', 'Shopify', 'WooCommerce', 'None'],
  })
  platform: 'Salla' | 'Zid' | 'Shopify' | 'WooCommerce' | 'None';

  @Prop({ required: true, enum: ['assistant', 'mini-store', 'both'] })
  interest: 'assistant' | 'mini-store' | 'both';

  @Prop() notes?: string;

  // UTM + سياق
  @Prop() utm_source?: string;
  @Prop() utm_medium?: string;
  @Prop() utm_campaign?: string;
  @Prop() utm_term?: string;
  @Prop() utm_content?: string;
  @Prop() pageUrl?: string;
  @Prop() referrer?: string;

  @Prop() sessionId?: string;
  @Prop() ip?: string;
  @Prop() userAgent?: string;

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;
}

export const WaitlistLeadSchema = SchemaFactory.createForClass(WaitlistLead);
// فهرس مفيد لمنع التكرار الزمني بالاستعلام
WaitlistLeadSchema.index({ email: 1, createdAt: 1 });
