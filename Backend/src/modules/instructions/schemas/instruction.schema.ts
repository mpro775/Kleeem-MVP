// src/modules/instructions/schemas/instruction.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type InstructionDocument = HydratedDocument<Instruction>;

@Schema({ timestamps: true })
export class Instruction {
  @Prop({ type: Types.ObjectId, ref: 'Merchant', required: false })
  merchantId?: Types.ObjectId;

  @Prop({ type: String, required: true })
  instruction!: string;

  @Prop({ type: [String], default: [] })
  relatedReplies?: string[];

  @Prop({ type: String, enum: ['auto', 'manual'], default: 'auto' })
  type!: string;

  @Prop({ type: Boolean, default: true })
  active!: boolean;
}

export const InstructionSchema = SchemaFactory.createForClass(Instruction);
