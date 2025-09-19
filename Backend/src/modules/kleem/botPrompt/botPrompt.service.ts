import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BotPrompt } from './schemas/botPrompt.schema';
import { CreateBotPromptDto } from './dto/create-botPrompt.dto';
import { UpdateBotPromptDto } from './dto/update-botPrompt.dto';
import { BOT_PROMPT_REPOSITORY } from './tokens';
import { BotPromptRepository } from './repositories/bot-prompt.repository';

@Injectable()
export class BotPromptService {
  constructor(
    @Inject(BOT_PROMPT_REPOSITORY)
    private readonly repo: BotPromptRepository,
  ) {}

  async create(dto: CreateBotPromptDto) {
    if (dto.type === 'system' && dto.active) {
      await this.repo.updateMany({ type: 'system' }, {
        active: false,
      } as Partial<BotPrompt>);
    }
    return this.repo.create({ ...dto, active: dto.active ?? false } as any);
  }

  async findAll(filter?: {
    type?: 'system' | 'user';
    includeArchived?: boolean;
  }) {
    return this.repo.findAll(filter);
  }

  async findById(id: string) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException('Prompt not found');
    return doc;
  }

  async update(id: string, dto: UpdateBotPromptDto) {
    const doc = await this.repo.updateById(id, dto as any);
    if (!doc) throw new NotFoundException('Prompt not found');

    if ((dto as any).active && doc.type === 'system') {
      await this.repo.updateMany(
        { _id: { $ne: (doc as any)._id }, type: 'system' },
        { active: false } as any,
      );
    }
    return doc;
  }

  async publish(id: string) {
    const doc = await this.repo.findById(id);
    if (!doc || doc.type !== 'system') throw new NotFoundException();

    await this.repo.updateMany({ type: 'system' }, { active: false } as any);
    const last = await this.repo.findOne(
      { type: 'system', archived: { $ne: true } },
      { version: -1 },
    );

    const nextVersion = ((last as any)?.version ?? 0) + 1;
    const updated = await this.repo.updateById(id, {
      version: nextVersion,
      active: true,
    } as any);
    return updated!;
  }

  async getActiveSystemPrompt(): Promise<string> {
    return this.getActiveSystemPromptOrDefault();
  }

  async setActive(id: string, active: boolean) {
    const doc = await this.repo.findById(id);
    if (!doc) throw new NotFoundException('Prompt not found');

    if (doc.type === 'system' && active) {
      await this.repo.updateMany({ type: 'system' }, { active: false } as any);
    }
    const updated = await this.repo.updateById(id, { active } as any);
    return updated!;
  }

  async archive(id: string) {
    const doc = await this.repo.updateById(id, {
      archived: true,
      active: false,
    } as any);
    if (!doc) throw new NotFoundException('Prompt not found');
    return doc;
  }

  async remove(id: string) {
    return this.repo.deleteById(id);
  }

  async getActiveSystemPromptOrDefault(): Promise<string> {
    const current = await this.repo.findOne(
      { type: 'system', active: true, archived: { $ne: true } },
      { updatedAt: -1 },
    );
    if ((current as any)?.content) return (current as any).content as string;

    return `أنت "كليم" — مساعد افتراضي ومندوب مبيعات لمنصة كليم.
- تحدّث بلغة ودّية واضحة.
- هدفك إقناع الزائر بالتجربة أو الاشتراك مع معالجة الاعتراضات.
- اربط كل ميزة بفائدة مباشرة للعميل.
- اختم كل رد بدعوة للإجراء (جرّب الآن، اطلب عرض، تواصل مع خبير).`;
  }
}
