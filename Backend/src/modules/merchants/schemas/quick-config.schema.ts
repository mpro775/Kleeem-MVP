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

  @Prop({ default: true })
  includeClosingPhrase: boolean;

  @Prop({ default: '' })
  customerServicePhone: string;

  @Prop({ default: '' })
  customerServiceWhatsapp: string;

  @Prop({ default: 'هل أقدر أساعدك بشي ثاني؟ 😊' })
  closingText: string;
}

export type QuickConfigDocument = QuickConfig & Document;
export const QuickConfigSchema = SchemaFactory.createForClass(QuickConfig);
