// src/modules/documents/schemas/document.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DocumentEntity = Document & {
  merchantId: string;
  filename: string;
  fileType: string;
  storageKey: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class DocumentSchemaClass {
  @Prop({ required: true }) merchantId!: string;
  @Prop({ required: true }) filename!: string;
  @Prop({ required: true }) fileType!: string;
  @Prop({ required: true }) storageKey!: string;
  @Prop({ default: 'pending' }) status!: string;
  @Prop() errorMessage?: string;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentSchemaClass);
export type DocumentDocument = Document & DocumentSchemaClass;
