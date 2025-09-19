import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BotFaq } from '../schemas/botFaq.schema';
import { BotFaqLean, BotFaqRepository } from './bot-faq.repository';

@Injectable()
export class BotFaqMongoRepository implements BotFaqRepository {
  constructor(
    @InjectModel(BotFaq.name) private readonly model: Model<BotFaq>,
  ) {}

  async create(data: Partial<BotFaq>): Promise<BotFaqLean> {
    const doc = await this.model.create(data as any);
    return doc.toObject() as any;
  }

  async findById(id: string): Promise<BotFaqLean | null> {
    return this.model.findById(id).lean<BotFaqLean>().exec();
  }

  async updateById(
    id: string,
    patch: Partial<BotFaq>,
  ): Promise<BotFaqLean | null> {
    return this.model
      .findByIdAndUpdate(id, patch as any, { new: true })
      .lean<BotFaqLean>()
      .exec();
  }

  async softDelete(id: string): Promise<BotFaqLean | null> {
    return this.model
      .findByIdAndUpdate(id, { status: 'deleted' } as any, { new: true })
      .lean<BotFaqLean>()
      .exec();
  }

  async findAllActiveSorted(): Promise<BotFaqLean[]> {
    return this.model
      .find({ status: 'active' } as any)
      .sort({ updatedAt: -1 })
      .lean<BotFaqLean[]>()
      .exec();
  }

  async findAllActiveLean(): Promise<BotFaqLean[]> {
    return this.model
      .find({ status: 'active' } as any)
      .lean<BotFaqLean[]>()
      .exec();
  }

  async insertMany(items: Partial<BotFaq>[]): Promise<BotFaqLean[]> {
    const docs = await this.model.insertMany(items as any[]);
    return docs.map((d) => d.toObject() as any);
  }

  async updateManyByIds(ids: string[], patch: Partial<BotFaq>): Promise<void> {
    await this.model.updateMany(
      { _id: { $in: ids.map((i) => new Types.ObjectId(i)) } },
      { $set: patch as any },
    );
  }
}
