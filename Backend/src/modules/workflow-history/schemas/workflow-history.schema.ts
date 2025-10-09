import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class WorkflowHistory extends Document {
  @Prop({ required: true }) merchantId!: string;
  @Prop({ required: true }) workflowId!: string;
  @Prop({ required: true }) version!: number; // رقم النسخة (1، 2، 3 ...)
  @Prop({ required: true, type: Object }) workflowJson: unknown; // محتوى JSON كامل للورك فلو
  @Prop({ required: true }) updatedBy!: string; // ID أو اسم من عدل (admin/support/service)
  @Prop({ default: Date.now }) updatedAt!: Date; // تاريخ التعديل
  @Prop({ default: false }) isRollback!: boolean; // هل تم إضافتها أثناء rollback؟
}

export const WorkflowHistorySchema =
  SchemaFactory.createForClass(WorkflowHistory);
