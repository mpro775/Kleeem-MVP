// src/modules/instructions/instructions.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Instruction, InstructionDocument } from './schemas/instruction.schema';
import { Model, Types } from 'mongoose';

@Injectable()
export class InstructionsService {
  constructor(
    @InjectModel(Instruction.name)
    private instructionModel: Model<InstructionDocument>,
  ) {}

  async create(instruction: {
    merchantId?: string;
    instruction: string;
    relatedReplies?: string[];
    type?: 'auto' | 'manual';
  }) {
    return this.instructionModel.create({
      ...instruction,
      type: instruction.type || 'auto',
      active: true,
    });
  }

  async findAll({
    merchantId,
    active,
    limit = 30,
    page = 1,
  }: {
    merchantId?: string;
    active?: boolean;
    limit?: number;
    page?: number;
  }) {
    const filter: any = {};
    if (merchantId) filter.merchantId = new Types.ObjectId(merchantId);
    if (typeof active === 'boolean') filter.active = active;
    return this.instructionModel
      .find(filter)
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ updatedAt: -1 })
      .lean();
  }

  async update(id: string, data: Partial<Instruction>) {
    return this.instructionModel.findByIdAndUpdate(id, data, { new: true });
  }

  async remove(id: string) {
    return this.instructionModel.findByIdAndDelete(id);
  }

  async deactivate(id: string) {
    return this.instructionModel.findByIdAndUpdate(
      id,
      { active: false },
      { new: true },
    );
  }

  async activate(id: string) {
    return this.instructionModel.findByIdAndUpdate(
      id,
      { active: true },
      { new: true },
    );
  }

  // جلب التوجيهات الفعالة فقط لتكوين البرومبت
  async getActiveInstructions(merchantId?: string) {
    const filter: any = { active: true };
    if (merchantId) filter.merchantId = new Types.ObjectId(merchantId);
    return this.instructionModel.find(filter).sort({ updatedAt: -1 }).lean();
  }
}
