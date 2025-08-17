import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class QuickConfig {
  @Prop({ default: 'خليجي' })
  dialect: string;

  @Prop({ default: 'ودّي' })
  tone: string;

  @Prop({ type: [String], default: [] })
  customInstructions: string[];

  @Prop({
    type: [String],
    default: ['products', 'policies', 'custom'],
  })
  sectionOrder: string[];

  // —— حقول التبديل الجديدة ——
  @Prop({ default: true })
  includeStoreUrl: boolean;

  @Prop({ default: true })
  includeAddress: boolean;

  @Prop({ default: true })
  includePolicies: boolean;

  @Prop({ default: true })
  includeWorkingHours: boolean;

  @Prop({ default: true })
  includeClosingPhrase: boolean;

  // === حقل رقم خدمة العملاء الجديد ===
  @Prop({ default: '' })
  customerServicePhone: string;
  // نص الخاتمة القابل للتخصيص
  @Prop({ default: 'هل أقدر أساعدك بشي ثاني؟ 😊' })
  closingText: string;
}

export type QuickConfigDocument = QuickConfig & Document;
export const QuickConfigSchema = SchemaFactory.createForClass(QuickConfig);
