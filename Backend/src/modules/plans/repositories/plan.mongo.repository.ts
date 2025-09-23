import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';

import { Plan, PlanDocument } from '../schemas/plan.schema';

import {
  PlanEntity,
  PlanFilter,
  PlanRepository,
  SortKey,
} from './plan.repository';

@Injectable()
export class PlanMongoRepository implements PlanRepository {
  constructor(
    @InjectModel(Plan.name)
    private readonly model: Model<PlanDocument>,
  ) {}

  async create(dto: Partial<PlanEntity>): Promise<PlanEntity> {
    const doc = await this.model.create(dto as unknown);
    return doc.toObject() as PlanEntity;
  }

  async findOneByName(name: string): Promise<PlanEntity | null> {
    return this.model.findOne({ name }).lean<PlanEntity>().exec();
  }

  private buildFilter(filter: PlanFilter): FilterQuery<PlanDocument> {
    const q: Record<string, unknown> = {};
    if (filter.archivedNotTrue !== false) q.archived = { $ne: true };
    if (typeof filter.isActive === 'boolean') q.isActive = filter.isActive;
    if (typeof filter.isTrial === 'boolean') q.isTrial = filter.isTrial;
    return q;
  }

  private sortMap(sort: SortKey): Record<string, 1 | -1> {
    const map: Record<SortKey, Record<string, 1 | -1>> = {
      priceAsc: { priceCents: 1 },
      priceDesc: { priceCents: -1 },
      createdDesc: { createdAt: -1 },
      createdAsc: { createdAt: 1 },
    };
    return map[sort] ?? { createdAt: -1 };
  }

  async paginate(
    filter: PlanFilter,
    sort: SortKey,
    page: number,
    limit: number,
  ): Promise<{ items: PlanEntity[]; total: number }> {
    const q = this.buildFilter(filter);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find(q)
        .sort(this.sortMap(sort))
        .skip(skip)
        .limit(limit)
        .lean<PlanEntity[]>(),
      this.model.countDocuments(q),
    ]);

    return { items, total };
  }

  async updateById(
    id: string,
    patch: Partial<PlanEntity>,
  ): Promise<PlanEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findByIdAndUpdate(id, patch, { new: true })
      .lean<PlanEntity>()
      .exec();
  }

  async archiveById(id: string): Promise<PlanEntity | null> {
    return this.updateById(id, { archived: true });
  }

  async findAll(): Promise<PlanEntity[]> {
    return this.model.find().lean<PlanEntity[]>().exec();
  }

  async findById(id: string): Promise<PlanEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findById(id).lean<PlanEntity>().exec();
  }

  async findByName(name: string): Promise<PlanEntity | null> {
    return this.model.findOne({ name }).lean<PlanEntity>().exec();
  }

  async deleteById(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const res = await this.model.findByIdAndDelete(id).exec();
    return !!res;
  }
}
