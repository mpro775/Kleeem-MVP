import { Injectable, Inject } from '@nestjs/common';
import { Instruction } from './schemas/instruction.schema';
import { InstructionsRepository } from './repositories/instructions.repository';

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
  }) {
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
  }) {
    return this.repo.findAll(params);
  }

  async findOne(id: string) {
    return this.repo.findById(id);
  }

  async update(id: string, data: Partial<Instruction>) {
    return this.repo.updateById(id, data);
  }

  async remove(id: string) {
    return this.repo.deleteById(id);
  }

  async deactivate(id: string) {
    return this.repo.setActive(id, false);
  }

  async activate(id: string) {
    return this.repo.setActive(id, true);
  }

  // جلب التوجيهات الفعّالة فقط لتكوين البرومبت
  async getActiveInstructions(merchantId?: string) {
    return this.repo.getActiveInstructions(merchantId);
  }
  async getCurrentInstructions(merchantId: string) {
    return { system: 'default', merchantId };
  }
}
