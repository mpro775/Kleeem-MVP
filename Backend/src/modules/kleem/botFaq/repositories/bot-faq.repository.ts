import { Types } from 'mongoose';
import { BotFaq } from '../schemas/botFaq.schema';

export type BotFaqLean = BotFaq & { _id: Types.ObjectId };

export interface BotFaqRepository {
  create(data: Partial<BotFaq>): Promise<BotFaqLean>;
  findById(id: string): Promise<BotFaqLean | null>;
  updateById(id: string, patch: Partial<BotFaq>): Promise<BotFaqLean | null>;
  softDelete(id: string): Promise<BotFaqLean | null>;

  findAllActiveSorted(): Promise<BotFaqLean[]>;
  findAllActiveLean(): Promise<BotFaqLean[]>;

  insertMany(items: Partial<BotFaq>[]): Promise<BotFaqLean[]>;
  updateManyByIds(ids: string[], patch: Partial<BotFaq>): Promise<void>;
}
