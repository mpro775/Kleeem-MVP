import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Storefront, StorefrontDocument } from '../schemas/storefront.schema';
import {
  StorefrontEntity,
  StorefrontRepository,
} from './storefront.repository';

@Injectable()
export class StorefrontMongoRepository implements StorefrontRepository {
  constructor(
    @InjectModel(Storefront.name)
    private readonly model: Model<StorefrontDocument>,
  ) {}

  async create(dto: Partial<Storefront>): Promise<StorefrontEntity> {
    const doc = await this.model.create(dto as any);
    return doc.toObject() as StorefrontEntity;
  }

  async findByIdOrSlugLean(slugOrId: string): Promise<StorefrontEntity | null> {
    const q: FilterQuery<StorefrontDocument> = Types.ObjectId.isValid(slugOrId)
      ? { $or: [{ _id: new Types.ObjectId(slugOrId) }, { slug: slugOrId }] }
      : { slug: slugOrId };
    return this.model.findOne(q).lean<StorefrontEntity>().exec();
  }

  async findByMerchant(merchantId: string): Promise<StorefrontEntity | null> {
    const or: any[] = [{ merchant: merchantId }];
    if (Types.ObjectId.isValid(merchantId))
      or.push({ merchant: new Types.ObjectId(merchantId) });
    return this.model.findOne({ $or: or }).lean<StorefrontEntity>().exec();
  }

  async existsSlug(slug: string, excludeId?: string): Promise<boolean> {
    const q: any = { slug };
    if (excludeId && Types.ObjectId.isValid(excludeId))
      q._id = { $ne: new Types.ObjectId(excludeId) };
    const exists = await this.model.exists(q).lean();
    return !!exists;
  }

  async updateById(
    id: string,
    patch: Partial<Storefront>,
  ): Promise<StorefrontEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findByIdAndUpdate(id, patch as any, { new: true })
      .lean<StorefrontEntity>()
      .exec();
  }

  async deleteByMerchant(merchantId: string): Promise<void> {
    await this.model.deleteOne({ merchant: merchantId }).exec();
  }
}
