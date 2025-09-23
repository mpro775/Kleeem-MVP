import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  Instruction,
  InstructionDocument,
} from '../schemas/instruction.schema';

import {
  FindAllParams,
  InstructionsRepository,
} from './instructions.repository';

@Injectable()
export class MongoInstructionsRepository implements InstructionsRepository {
  constructor(
    @InjectModel(Instruction.name)
    private readonly instructionModel: Model<InstructionDocument>,
  ) {}

  private toId(v?: string) {
    return v ? new Types.ObjectId(v) : undefined;
  }

  async create(data: {
    merchantId?: string;
    instruction: string;
    relatedReplies?: string[];
    type?: 'auto' | 'manual';
    active?: boolean;
  }): Promise<Instruction & { _id: Types.ObjectId }> {
    const doc = await this.instructionModel.create({
      instruction: data.instruction,
      relatedReplies: data.relatedReplies ?? [],
      type: data.type ?? 'auto',
      active: data.active ?? true,
      merchantId: data.merchantId ? this.toId(data.merchantId) : undefined,
    });
    return (doc.toObject ? doc.toObject() : doc) as unknown as Instruction & {
      _id: Types.ObjectId;
    };
  }

  async findAll(
    params: FindAllParams,
  ): Promise<Array<Instruction & { _id: Types.ObjectId }>> {
    const { merchantId, active, limit = 30, page = 1 } = params || {};
    const filter: Record<string, unknown> = {};
    if (merchantId) filter.merchantId = this.toId(merchantId);
    if (typeof active === 'boolean') filter.active = active;

    return (await this.instructionModel
      .find(filter)
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 })
      .lean()
      .exec()) as unknown as Array<Instruction & { _id: Types.ObjectId }>;
  }

  async findById(
    id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return (await this.instructionModel
      .findById(id)
      .lean()
      .exec()) as unknown as (Instruction & { _id: Types.ObjectId }) | null;
  }

  async updateById(
    id: string,
    data: Partial<Instruction>,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return (await this.instructionModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec()) as unknown as (Instruction & { _id: Types.ObjectId }) | null;
  }

  async deleteById(
    id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return (await this.instructionModel
      .findByIdAndDelete(id)
      .lean()
      .exec()) as unknown as (Instruction & { _id: Types.ObjectId }) | null;
  }

  async setActive(
    id: string,
    active: boolean,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return (await this.instructionModel
      .findByIdAndUpdate(id, { active }, { new: true })
      .lean()
      .exec()) as unknown as (Instruction & { _id: Types.ObjectId }) | null;
  }

  async getActiveInstructions(
    merchantId?: string,
  ): Promise<Array<Instruction & { _id: Types.ObjectId }>> {
    const filter: Record<string, unknown> = { active: true };
    if (merchantId) filter.merchantId = this.toId(merchantId);
    return (await this.instructionModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .lean()
      .exec()) as unknown as Array<Instruction & { _id: Types.ObjectId }>;
  }
}
