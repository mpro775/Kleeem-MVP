import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Lead, LeadDocument } from '../schemas/lead.schema';
import { LeadEntity, LeadRepository } from './lead.repository';

@Injectable()
export class LeadMongoRepository implements LeadRepository {
  constructor(
    @InjectModel(Lead.name)
    private readonly model: Model<LeadDocument>,
  ) {}

  private notDeleted(): FilterQuery<LeadDocument> {
    return {
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    } as any;
  }

  async create(data: Partial<LeadEntity>): Promise<LeadEntity> {
    const doc = await this.model.create(data as any);
    return doc.toObject() as LeadEntity;
  }

  async findAllForMerchant(merchantId: string): Promise<LeadEntity[]> {
    return this.model
      .find({ merchantId, ...this.notDeleted() })
      .sort({ createdAt: -1 })
      .lean<LeadEntity[]>()
      .exec();
  }

  async paginateByMerchant(
    merchantId: string,
    opts: { page?: number; limit?: number },
  ): Promise<{
    items: LeadEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find({ merchantId, ...this.notDeleted() })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<LeadEntity[]>()
        .exec(),
      this.model.countDocuments({ merchantId, ...this.notDeleted() }),
    ]);

    return { items, total, page, limit };
  }

  async updateOneForMerchant(
    id: string,
    merchantId: string,
    patch: Partial<LeadEntity>,
  ): Promise<LeadEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOneAndUpdate(
        { _id: id, merchantId, ...this.notDeleted() },
        { $set: patch },
        { new: true },
      )
      .lean<LeadEntity>()
      .exec();
  }

  async softDeleteById(id: string, merchantId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const res = await this.model.updateOne(
      { _id: id, merchantId, ...this.notDeleted() },
      { $set: { deletedAt: new Date() } },
    );
    return (res.modifiedCount ?? 0) > 0;
  }

  async getPhoneBySession(
    merchantId: string,
    sessionId: string,
  ): Promise<string | undefined> {
    const doc = await this.model
      .findOne({
        merchantId,
        sessionId,
        phoneNormalized: { $exists: true, $ne: null },
        ...this.notDeleted(),
      })
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean<LeadEntity>()
      .exec();
    return doc?.phoneNormalized;
  }
}
