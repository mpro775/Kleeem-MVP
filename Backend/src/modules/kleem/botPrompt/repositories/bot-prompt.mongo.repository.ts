import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, RootFilterQuery } from 'mongoose';

import { BotPrompt } from '../schemas/botPrompt.schema';

import { BotPromptLean, BotPromptRepository } from './bot-prompt.repository';

@Injectable()
export class BotPromptMongoRepository implements BotPromptRepository {
  constructor(
    @InjectModel(BotPrompt.name) private readonly model: Model<BotPrompt>,
  ) {}

  async create(data: Partial<BotPrompt>): Promise<BotPromptLean> {
    const doc = await this.model.create(data);
    return doc.toObject() as BotPromptLean;
  }

  async findAll(filter?: {
    type?: 'system' | 'user';
    includeArchived?: boolean;
  }): Promise<BotPromptLean[]> {
    const q: Record<string, unknown> = {};
    if (filter?.type) q.type = filter.type;
    if (!filter?.includeArchived) q.archived = { $ne: true };
    return this.model
      .find(q)
      .sort({ updatedAt: -1 })
      .lean<BotPromptLean[]>()
      .exec();
  }

  async findById(id: string): Promise<BotPromptLean | null> {
    return this.model.findById(id).lean<BotPromptLean>().exec();
  }

  async findOne(
    filter: Record<string, unknown>,
    sort?: Record<string, 1 | -1>,
  ): Promise<BotPromptLean | null> {
    let q = this.model.findOne(filter);
    if (sort) q = q.sort(sort);
    return q.lean<BotPromptLean>().exec();
  }

  async updateById(
    id: string,
    patch: Partial<BotPrompt>,
  ): Promise<BotPromptLean | null> {
    return this.model
      .findByIdAndUpdate(id, patch as unknown as Partial<BotPrompt>, {
        new: true,
      })
      .lean<BotPromptLean>()
      .exec();
  }

  async updateMany(
    filter: Record<string, unknown>,
    patch: Partial<BotPrompt>,
  ): Promise<void> {
    await this.model
      .updateMany(filter as unknown as RootFilterQuery<BotPrompt>, {
        $set: patch as unknown as Partial<BotPrompt>,
      })
      .exec();
  }

  async deleteById(id: string): Promise<{ deleted: boolean }> {
    const res = await this.model
      .deleteOne({ _id: id } as unknown as RootFilterQuery<BotPrompt>)
      .exec();
    return { deleted: res.deletedCount === 1 };
  }
}
