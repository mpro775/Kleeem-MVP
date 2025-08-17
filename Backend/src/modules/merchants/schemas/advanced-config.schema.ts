import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class AdvancedConfig {
  @Prop({ default: '' }) template: string;

  @Prop({ default: () => new Date() }) updatedAt: Date;

  @Prop()
  note?: string;
}

export type AdvancedConfigDocument = AdvancedConfig & Document;
export const AdvancedConfigSchema =
  SchemaFactory.createForClass(AdvancedConfig);
