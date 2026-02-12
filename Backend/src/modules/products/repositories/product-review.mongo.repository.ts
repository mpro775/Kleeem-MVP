// src/modules/products/repositories/product-review.mongo.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type FilterQuery, type UpdateQuery } from 'mongoose';

import {
  ProductReview,
  ProductReviewDocument,
  ProductReviewStatus,
} from '../schemas/product-review.schema';

import { ProductReviewRepository } from './product-review.repository';

@Injectable()
export class ProductReviewMongoRepository implements ProductReviewRepository {
  constructor(
    @InjectModel(ProductReview.name)
    private readonly model: Model<ProductReviewDocument>,
  ) {}

  async create(review: Partial<ProductReview>): Promise<ProductReview> {
    const created = await this.model.create(review);
    return created.toObject();
  }

  async findById(id: string): Promise<ProductReview | null> {
    return this.model.findById(id).exec();
  }

  async findByIdAndMerchant(
    id: string,
    merchantId: string,
  ): Promise<ProductReview | null> {
    return this.model.findOne({ _id: id, merchantId }).exec();
  }

  async findByCustomerAndProduct(
    customerId: string,
    productId: string,
  ): Promise<ProductReview | null> {
    return this.model
      .findOne({
        customerId,
        productId,
        status: { $ne: ProductReviewStatus.REJECTED }, // لا نعتبر المرفوضة كتقييم موجود
      })
      .exec();
  }

  async findApprovedByProduct(
    merchantId: string,
    productId: string,
    page: number,
    limit: number,
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.model
        .find({ merchantId, productId, status: ProductReviewStatus.APPROVED })
        .sort({ approvedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name')
        .exec(),
      this.model.countDocuments({
        merchantId,
        productId,
        status: ProductReviewStatus.APPROVED,
      }),
    ]);

    return { reviews, total };
  }

  async findAllByProduct(
    merchantId: string,
    productId: string,
    page: number = 1,
    limit: number = 20,
    status?: ProductReviewStatus,
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    const skip = (page - 1) * limit;
    const query: FilterQuery<ProductReviewDocument> = { merchantId, productId };

    if (status) {
      query.status = status;
    }

    const [reviews, total] = await Promise.all([
      this.model
        .find(query)
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name')
        .exec(),
      this.model.countDocuments(query),
    ]);

    return { reviews, total };
  }

  async findAllApprovedByProduct(
    merchantId: string,
    productId: string,
  ): Promise<ProductReview[]> {
    return this.model
      .find({
        merchantId,
        productId,
        status: ProductReviewStatus.APPROVED,
      })
      .exec();
  }

  async findByCustomer(
    merchantId: string,
    customerId: string,
    page: number,
    limit: number,
  ): Promise<{ reviews: ProductReview[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.model
        .find({ merchantId, customerId })
        .sort({ reviewedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('productId', 'name')
        .exec(),
      this.model.countDocuments({ merchantId, customerId }),
    ]);

    return { reviews, total };
  }

  async updateStatus(
    id: string,
    status: ProductReviewStatus,
    approvedAt?: Date,
    rejectedAt?: Date,
  ): Promise<ProductReview | null> {
    const updateData: UpdateQuery<ProductReviewDocument> = { status };

    if (approvedAt) {
      updateData.approvedAt = approvedAt;
    }

    if (rejectedAt) {
      updateData.rejectedAt = rejectedAt;
    }

    return this.model.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }
}
