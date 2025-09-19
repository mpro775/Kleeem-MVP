import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, HydratedDocument, Model, Types } from 'mongoose';
import { Category, CategoryDocument } from '../schemas/category.schema';
import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';
import { CategoriesRepository } from './categories.repository';

@Injectable()
export class MongoCategoriesRepository implements CategoriesRepository {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async createCategory(
    data: Partial<HydratedDocument<Category>>,
  ): Promise<HydratedDocument<Category>> {
    const doc = new this.categoryModel(data as any);
    await doc.save();
    return doc as HydratedDocument<Category>;
  }

  async findAllByMerchant(merchantId: Types.ObjectId) {
    return this.categoryModel
      .find({ merchantId })
      .sort({ depth: 1, order: 1, name: 1 })
      .lean();
  }

  async findByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: Types.ObjectId,
  ) {
    return this.categoryModel.findOne({ _id: id, merchantId });
  }

  async findLeanByIdForMerchant(
    id: string | Types.ObjectId,
    merchantId: Types.ObjectId,
  ) {
    return this.categoryModel.findOne({ _id: id, merchantId }).lean();
  }

  async updateCategoryFields(
    id: Types.ObjectId,
    merchantId: Types.ObjectId,
    update: Record<string, any>,
  ) {
    await this.categoryModel.updateOne(
      { _id: id, merchantId },
      { $set: update },
    );
  }

  async deleteManyByIds(merchantId: Types.ObjectId, ids: Types.ObjectId[]) {
    await this.categoryModel.deleteMany({ merchantId, _id: { $in: ids } });
  }

  async parentExistsForMerchant(
    parentId: Types.ObjectId,
    merchantId: Types.ObjectId,
  ) {
    return !!(await this.categoryModel.exists({ _id: parentId, merchantId }));
  }

  async isDescendant(
    targetId: Types.ObjectId,
    ancestorId: Types.ObjectId,
    merchantId: Types.ObjectId,
  ) {
    return !!(await this.categoryModel.exists({
      _id: targetId,
      merchantId,
      ancestors: ancestorId,
    }));
  }

  async listSiblings(
    merchantId: Types.ObjectId,
    parentId: Types.ObjectId | null,
  ) {
    return this.categoryModel
      .find({ merchantId, parent: parentId })
      .sort({ order: 1, name: 1 })
      .lean();
  }

  async updateOrder(
    categoryId: Types.ObjectId,
    order: number,
    session?: ClientSession,
  ) {
    await this.categoryModel.updateOne(
      { _id: categoryId },
      { $set: { order } },
      { session },
    );
  }

  async normalizeSiblingsOrders(
    merchantId: Types.ObjectId,
    parentId: Types.ObjectId | null,
    session?: ClientSession,
  ) {
    const siblings = await this.categoryModel
      .find({ merchantId, parent: parentId }, null, { session })
      .sort({ order: 1, name: 1 });
    for (let i = 0; i < siblings.length; i++) {
      if (siblings[i].order !== i) {
        await this.categoryModel.updateOne(
          { _id: siblings[i]._id },
          { $set: { order: i } },
          { session },
        );
      }
    }
  }

  async findManyByIds(ids: Types.ObjectId[], fields?: Record<string, 1 | 0>) {
    return this.categoryModel.find({ _id: { $in: ids } }, fields as any).lean();
  }

  async findSubtreeIds(merchantId: Types.ObjectId, rootId: Types.ObjectId) {
    const rows = await this.categoryModel
      .find({ merchantId, $or: [{ _id: rootId }, { ancestors: rootId }] })
      .select('_id')
      .lean();
    return rows.map((r) => r._id as Types.ObjectId);
  }

  async anyProductsInCategories(
    merchantId: Types.ObjectId,
    categoryIds: Types.ObjectId[],
  ) {
    return !!(await this.productModel.exists({
      merchantId,
      category: { $in: categoryIds },
    }));
  }

  async startSession(): Promise<ClientSession> {
    return this.categoryModel.db.startSession();
  }
}
