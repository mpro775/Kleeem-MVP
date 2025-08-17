// src/modules/kleem/botPrompt/botPrompt.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BotPrompt } from './schemas/botPrompt.schema';
import { CreateBotPromptDto } from './dto/create-botPrompt.dto';
import { UpdateBotPromptDto } from './dto/update-botPrompt.dto';

@Injectable()
export class BotPromptService {
  constructor(
    @InjectModel(BotPrompt.name) private readonly model: Model<BotPrompt>,
  ) {}

  async create(dto: CreateBotPromptDto) {
    // إن كان النوع system ومطلوب تفعيله: عطّل الباقي
    if (dto.type === 'system' && dto.active) {
      await this.model.updateMany(
        { type: 'system' },
        { $set: { active: false } },
      );
    }
    return this.model.create({ ...dto, active: dto.active ?? false });
  }

  async findAll(filter?: {
    type?: 'system' | 'user';
    includeArchived?: boolean;
  }) {
    const q: any = {};
    if (filter?.type) q.type = filter.type;
    if (!filter?.includeArchived) q.archived = { $ne: true };
    return this.model.find(q).sort({ updatedAt: -1 }).lean();
  }

  async findById(id: string) {
    const doc = await this.model.findById(id).lean();
    if (!doc) throw new NotFoundException('Prompt not found');
    return doc;
  }

  async update(id: string, dto: UpdateBotPromptDto) {
    const doc = await this.model.findByIdAndUpdate(id, dto, { new: true });
    if (!doc) throw new NotFoundException('Prompt not found');

    // لو غيّرناه إلى active=true ونوعه system: عطّل غيره
    if (dto.active && doc.type === 'system') {
      await this.model.updateMany(
        { _id: { $ne: doc._id }, type: 'system' },
        { $set: { active: false } },
      );
    }
    return doc;
  }
  async publish(id: string) {
    const doc = await this.model.findById(id);
    if (!doc || doc.type !== 'system') throw new NotFoundException();

    await this.model.updateMany(
      { type: 'system' },
      { $set: { active: false } },
    );
    const last = await this.model
      .findOne({ type: 'system', archived: { $ne: true } })
      .sort({ version: -1 })
      .lean();
    doc.version = (last?.version ?? 0) + 1;
    doc.active = true;
    await doc.save();
    return doc.toObject();
  }
  async getActiveSystemPrompt(): Promise<string> {
    return this.getActiveSystemPromptOrDefault();
  }
  async setActive(id: string, active: boolean) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Prompt not found');

    if (doc.type === 'system' && active) {
      await this.model.updateMany(
        { type: 'system' },
        { $set: { active: false } },
      );
    }
    doc.active = active;
    await doc.save();
    return doc;
  }

  async archive(id: string) {
    const doc = await this.model.findByIdAndUpdate(
      id,
      { archived: true, active: false },
      { new: true },
    );
    if (!doc) throw new NotFoundException('Prompt not found');
    return doc;
  }

  async remove(id: string) {
    const res = await this.model.deleteOne({ _id: id });
    return { deleted: res.deletedCount === 1 };
  }

  // تُستخدم في KleemChatService
  async getActiveSystemPromptOrDefault(): Promise<string> {
    const current = await this.model
      .findOne({ type: 'system', active: true, archived: { $ne: true } })
      .sort({ updatedAt: -1 })
      .lean();

    if (current?.content) return current.content;

    // Fallback افتراضي (عدّله بما يناسب كليم)
    return `أنت "كليم" — مساعد افتراضي ومندوب مبيعات لمنصة كليم.
- تحدّث بلغة ودّية واضحة.
- هدفك إقناع الزائر بالتجربة أو الاشتراك مع معالجة الاعتراضات.
- اربط كل ميزة بفائدة مباشرة للعميل.
- اختم كل رد بدعوة للإجراء (جرّب الآن، اطلب عرض، تواصل مع خبير).`;
  }
}
