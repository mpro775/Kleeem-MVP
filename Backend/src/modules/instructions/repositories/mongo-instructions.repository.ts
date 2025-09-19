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
  }) {
    const doc = await this.instructionModel.create({
      instruction: data.instruction,
      relatedReplies: data.relatedReplies ?? [],
      type: data.type ?? 'auto',
      active: data.active ?? true,
      merchantId: data.merchantId ? this.toId(data.merchantId) : undefined,
    });
    return (doc.toObject ? doc.toObject() : doc) as any;
  }

  async findAll(params: FindAllParams) {
    const { merchantId, active, limit = 30, page = 1 } = params || {};
    const filter: any = {};
    if (merchantId) filter.merchantId = this.toId(merchantId);
    if (typeof active === 'boolean') filter.active = active;

    return this.instructionModel
      .find(filter)
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 })
      .lean()
      .exec() as any;
  }

  async findById(id: string) {
    return this.instructionModel.findById(id).lean().exec() as any;
  }

  async updateById(id: string, data: Partial<Instruction>) {
    return this.instructionModel
      .findByIdAndUpdate(id, data, { new: true })
      .lean()
      .exec() as any;
  }

  async deleteById(id: string) {
    return this.instructionModel.findByIdAndDelete(id).lean().exec() as any;
  }

  async setActive(id: string, active: boolean) {
    return this.instructionModel
      .findByIdAndUpdate(id, { active }, { new: true })
      .lean()
      .exec() as any;
  }

  async getActiveInstructions(merchantId?: string) {
    const filter: any = { active: true };
    if (merchantId) filter.merchantId = this.toId(merchantId);
    return this.instructionModel
      .find(filter)
      .sort({ updatedAt: -1 })
      .lean()
      .exec() as any;
  }
}
