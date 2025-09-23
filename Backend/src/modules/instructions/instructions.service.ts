import { Injectable, Inject } from '@nestjs/common';
import { Types } from 'mongoose';

import { InstructionsRepository } from './repositories/instructions.repository';
import { Instruction } from './schemas/instruction.schema';

@Injectable()
export class InstructionsService {
  constructor(
    @Inject('InstructionsRepository')
    private readonly repo: InstructionsRepository,
  ) {}

  async create(instruction: {
    merchantId?: string;
    instruction: string;
    relatedReplies?: string[];
    type?: 'auto' | 'manual';
  }): Promise<Instruction & { _id: Types.ObjectId }> {
    // نفس العقد السابق لكن عبر الـ Repository
    return this.repo.create({
      merchantId: instruction.merchantId,
      instruction: instruction.instruction,
      relatedReplies: instruction.relatedReplies,
      type: instruction.type ?? 'auto',
      active: true,
    });
  }

  async findAll(params: {
    merchantId?: string;
    active?: boolean;
    limit?: number;
    page?: number;
  }): Promise<Array<Instruction & { _id: Types.ObjectId }>> {
    return this.repo.findAll(params);
  }

  async findOne(
    id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return this.repo.findById(id);
  }

  async update(
    id: string,
    data: Partial<Instruction>,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return this.repo.updateById(id, data);
  }

  async remove(
    id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return this.repo.deleteById(id);
  }

  async deactivate(
    id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return this.repo.setActive(id, false);
  }

  async activate(
    id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    return this.repo.setActive(id, true);
  }

  // جلب التوجيهات الفعّالة فقط لتكوين البرومبت
  async getActiveInstructions(
    merchantId?: string,
  ): Promise<Array<Instruction & { _id: Types.ObjectId }>> {
    return this.repo.getActiveInstructions(merchantId);
  }
  getCurrentInstructions(merchantId: string): {
    system: string;
    merchantId: string;
  } {
    return { system: 'default', merchantId };
  }
}
