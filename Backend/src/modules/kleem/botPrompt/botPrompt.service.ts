import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { CreateBotPromptDto } from './dto/create-botPrompt.dto';
import { UpdateBotPromptDto } from './dto/update-botPrompt.dto';
import {
  BotPromptLean,
  BotPromptRepository,
} from './repositories/bot-prompt.repository';
import { BotPrompt } from './schemas/botPrompt.schema';
import { BOT_PROMPT_REPOSITORY } from './tokens';

@Injectable()
export class BotPromptService {
  constructor(
    @Inject(BOT_PROMPT_REPOSITORY)
    private readonly repo: BotPromptRepository,
  ) {}

  async create(dto: CreateBotPromptDto): Promise<BotPromptLean> {
    if (dto.type === 'system' && dto.active) {
      await this.repo.updateMany({ type: 'system' }, {
        active: false,
      } as Partial<BotPrompt>);
    }
    return this.repo.create({
      ...dto,
      active: dto.active ?? false,
    } as unknown as Partial<BotPrompt>);
  }

  async findAll(filter?: {
    type?: 'system' | 'user';
    includeArchived?: boolean;
  }): Promise<BotPromptLean[]> {
    return this.repo.findAll(filter);
  }

  async findById(id: string): Promise<BotPromptLean> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException('Prompt not found');
    return doc;
  }

  async update(id: string, dto: UpdateBotPromptDto): Promise<BotPromptLean> {
    const doc = await this.repo.updateById(
      id,
      dto as unknown as Partial<BotPrompt>,
    );
    if (!doc) throw new NotFoundException('Prompt not found');

    if ((dto as unknown as BotPromptLean).active && doc.type === 'system') {
      await this.repo.updateMany(
        { _id: { $ne: (doc as unknown as BotPromptLean)._id }, type: 'system' },
        { active: false } as unknown as Partial<BotPrompt>,
      );
    }
    return doc;
  }

  async publish(id: string): Promise<BotPromptLean> {
    const doc = await this.repo.findById(id);
    if (!doc || doc.type !== 'system') throw new NotFoundException();

    await this.repo.updateMany({ type: 'system' }, {
      active: false,
    } as unknown as Partial<BotPrompt>);
    const last = await this.repo.findOne(
      { type: 'system', archived: { $ne: true } },
      { version: -1 },
    );

    const nextVersion = ((last as unknown as BotPromptLean)?.version ?? 0) + 1;
    const updated = await this.repo.updateById(id, {
      version: nextVersion,
      active: true,
    } as unknown as Partial<BotPrompt>);
    return updated!;
  }

  async getActiveSystemPrompt(): Promise<string> {
    return this.getActiveSystemPromptOrDefault();
  }

  async setActive(id: string, active: boolean): Promise<BotPromptLean> {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException('Prompt not found');

    if (doc.type === 'system' && active) {
      await this.repo.updateMany({ type: 'system' }, {
        active: false,
      } as unknown as Partial<BotPrompt>);
    }
    const updated = await this.repo.updateById(id, {
      active,
    } as unknown as Partial<BotPrompt>);
    return updated!;
  }

  async archive(id: string): Promise<BotPromptLean> {
    const doc = await this.repo.updateById(id, {
      archived: true,
      active: false,
    } as unknown as Partial<BotPrompt>);
    if (!doc) throw new NotFoundException('Prompt not found');
    return doc;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    return this.repo.deleteById(id);
  }

  async getActiveSystemPromptOrDefault(): Promise<string> {
    const current = await this.repo.findOne(
      { type: 'system', active: true, archived: { $ne: true } },
      { updatedAt: -1 },
    );
    if ((current as unknown as BotPromptLean)?.content)
      return (current as unknown as BotPromptLean).content;

    return `أنت "كليم" — مساعد افتراضي ومندوب مبيعات لمنصة كليم.
- تحدّث بلغة ودّية واضحة.
- هدفك إقناع الزائر بالتجربة أو الاشتراك مع معالجة الاعتراضات.
- اربط كل ميزة بفائدة مباشرة للعميل.
- اختم كل رد بدعوة للإجراء (جرّب الآن، اطلب عرض، تواصل مع خبير).`;
  }
}
