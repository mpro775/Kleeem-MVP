import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SourceUrl } from '../schemas/source-url.schema';
import { SourceUrlEntity, SourceUrlRepository } from './source-url.repository';

@Injectable()
export class SourceUrlMongoRepository implements SourceUrlRepository {
  constructor(
    @InjectModel(SourceUrl.name)
    private readonly model: Model<SourceUrl>,
  ) {}

  async createMany(
    records: Array<{
      merchantId: string;
      url: string;
      status?: SourceUrlEntity['status'];
    }>,
  ): Promise<SourceUrlEntity[]> {
    const docs = await this.model.insertMany(
      records.map((r) => ({ ...r, status: r.status ?? 'pending' })),
      { ordered: false },
    );
    return docs as unknown as SourceUrlEntity[];
  }

  async markCompleted(id: string, textExtracted: string): Promise<void> {
    await this.model.updateOne(
      { _id: id },
      { status: 'completed', textExtracted },
    );
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.model.updateOne({ _id: id }, { status: 'failed', errorMessage });
  }

  async findByMerchant(merchantId: string): Promise<SourceUrlEntity[]> {
    return this.model.find({ merchantId }).lean<SourceUrlEntity[]>().exec();
  }

  async findListByMerchant(
    merchantId: string,
  ): Promise<
    Array<
      Pick<
        SourceUrlEntity,
        '_id' | 'url' | 'status' | 'errorMessage' | 'createdAt'
      >
    >
  > {
    return this.model
      .find({ merchantId })
      .select({ _id: 1, url: 1, status: 1, errorMessage: 1, createdAt: 1 })
      .lean<
        Array<
          Pick<
            SourceUrlEntity,
            '_id' | 'url' | 'status' | 'errorMessage' | 'createdAt'
          >
        >
      >()
      .exec();
  }

  async findByIdForMerchant(
    id: string,
    merchantId: string,
  ): Promise<SourceUrlEntity | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({ _id: id, merchantId })
      .lean<SourceUrlEntity>()
      .exec();
  }

  async findByUrlForMerchant(
    url: string,
    merchantId: string,
  ): Promise<SourceUrlEntity | null> {
    return this.model
      .findOne({ url, merchantId })
      .lean<SourceUrlEntity>()
      .exec();
  }

  async deleteByIdForMerchant(id: string, merchantId: string): Promise<number> {
    if (!Types.ObjectId.isValid(id)) return 0;
    const { deletedCount } = await this.model.deleteOne({
      _id: id,
      merchantId,
    });
    return deletedCount ?? 0;
  }

  async deleteByMerchant(merchantId: string): Promise<number> {
    const { deletedCount } = await this.model.deleteMany({ merchantId });
    return deletedCount ?? 0;
  }

  async paginateByMerchant(
    merchantId: string,
    opts: { page: number; limit: number },
  ): Promise<{
    items: SourceUrlEntity[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.model
        .find({ merchantId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.model.countDocuments({ merchantId }),
    ]);
    return { items: items as unknown as SourceUrlEntity[], total, page, limit };
  }
}
