import type { BotPrompt } from '../schemas/botPrompt.schema';

export type BotPromptLean = BotPrompt & { _id: string };

export interface BotPromptRepository {
  create(data: Partial<BotPrompt>): Promise<BotPromptLean>;
  findAll(filter?: {
    type?: 'system' | 'user';
    includeArchived?: boolean;
  }): Promise<BotPromptLean[]>;
  findById(id: string): Promise<BotPromptLean | null>;
  findOne(
    filter: Record<string, unknown>,
    sort?: Record<string, 1 | -1>,
  ): Promise<BotPromptLean | null>;
  updateById(
    id: string,
    patch: Partial<BotPrompt>,
  ): Promise<BotPromptLean | null>;
  updateMany(
    filter: Record<string, unknown>,
    patch: Partial<BotPrompt>,
  ): Promise<void>;
  deleteById(id: string): Promise<{ deleted: boolean }>;
}
