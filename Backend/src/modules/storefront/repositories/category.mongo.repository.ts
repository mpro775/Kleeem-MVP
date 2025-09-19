import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
} from '../../categories/schemas/category.schema';
import {
  CategoryEntity,
  StorefrontCategoryRepository,
} from './category.repository';

@Injectable()
export class StorefrontCategoryMongoRepository
  implements StorefrontCategoryRepository
{
  constructor(
    @InjectModel(Category.name)
    private readonly model: Model<CategoryDocument>,
  ) {}

  async listByMerchant(merchantId: string): Promise<CategoryEntity[]> {
    return this.model
      .find({ merchantId: new Types.ObjectId(merchantId) })
      .sort({ name: 1 })
      .lean<CategoryEntity[]>()
      .exec();
  }
}
