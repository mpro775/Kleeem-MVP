import type { Instruction } from '../schemas/instruction.schema';
import type { Types } from 'mongoose';

export interface FindAllParams {
  merchantId?: string;
  active?: boolean;
  limit?: number;
  page?: number;
}

export interface InstructionsRepository {
  create(data: {
    merchantId?: string;
    instruction: string;
    relatedReplies?: string[];
    type?: 'auto' | 'manual';
    active?: boolean;
  }): Promise<Instruction & { _id: Types.ObjectId }>;

  findAll(
    params: FindAllParams,
  ): Promise<Array<Instruction & { _id: Types.ObjectId }>>;

  findById(id: string): Promise<(Instruction & { _id: Types.ObjectId }) | null>;

  updateById(
    id: string,
    data: Partial<Instruction>,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null>;

  deleteById(
    id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null>;

  setActive(
    id: string,
    active: boolean,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null>;

  getActiveInstructions(
    merchantId?: string,
  ): Promise<Array<Instruction & { _id: Types.ObjectId }>>;
}
