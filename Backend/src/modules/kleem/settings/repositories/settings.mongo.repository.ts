import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BotRuntimeSettings } from '../botRuntimeSettings.schema';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsMongoRepository implements SettingsRepository {
  constructor(
    @InjectModel(BotRuntimeSettings.name)
    private readonly model: Model<BotRuntimeSettings>,
  ) {}

  async findOneLean(): Promise<BotRuntimeSettings | null> {
    return this.model.findOne().lean<BotRuntimeSettings>().exec();
  }

  async create(data: Partial<BotRuntimeSettings>): Promise<BotRuntimeSettings> {
    const doc = await this.model.create(data as any);
    return doc.toObject() as any;
  }

  async findOneAndUpdate(
    patch: Partial<BotRuntimeSettings>,
  ): Promise<BotRuntimeSettings> {
    const doc = await this.model
      .findOneAndUpdate({}, patch as any, { upsert: true, new: true })
      .lean<BotRuntimeSettings>()
      .exec();
    return doc!;
  }
}
