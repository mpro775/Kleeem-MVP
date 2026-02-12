// src/modules/coupons/repositories/mongo-coupons.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Coupon, CouponDocument } from '../schemas/coupon.schema';

import { CouponsRepository } from './coupons.repository';

@Injectable()
export class MongoCouponsRepository implements CouponsRepository {
  constructor(
    @InjectModel(Coupon.name)
    private readonly couponModel: Model<CouponDocument>,
  ) {}

  async create(data: Partial<Coupon>): Promise<Coupon> {
    const coupon = new this.couponModel(data);
    return coupon.save();
  }

  async findById(id: string): Promise<Coupon | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.couponModel.findById(id).lean().exec();
  }

  async findByCode(merchantId: string, code: string): Promise<Coupon | null> {
    if (!Types.ObjectId.isValid(merchantId)) return null;

    return this.couponModel
      .findOne({
        merchantId: new Types.ObjectId(merchantId),
        code: code.toUpperCase().trim(),
      })
      .lean()
      .exec();
  }

  async findByMerchant(
    merchantId: string,
    options: {
      status?: string;
      search?: string;
      limit?: number;
      skip?: number;
    } = {},
  ): Promise<{ coupons: Coupon[]; total: number }> {
    if (!Types.ObjectId.isValid(merchantId)) {
      return { coupons: [], total: 0 };
    }

    const query: Record<string, unknown> = {
      merchantId: new Types.ObjectId(merchantId),
    };

    if (options.status) {
      query.status = options.status;
    }

    const searchTrimmed = options.search?.trim();
    if (searchTrimmed) {
      const searchRegex = new RegExp(
        searchTrimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      query.$or = [{ code: searchRegex }, { description: searchRegex }];
    }

    const limit = options.limit || 20;
    const skip = options.skip || 0;

    const [coupons, total] = await Promise.all([
      this.couponModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
      this.couponModel.countDocuments(query).exec(),
    ]);

    return { coupons, total };
  }

  async update(id: string, data: Partial<Coupon>): Promise<Coupon | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    return this.couponModel
      .findByIdAndUpdate(id, { $set: data }, { new: true })
      .lean()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;

    const result = await this.couponModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async incrementUsage(
    id: string,
    customerPhone?: string,
  ): Promise<Coupon | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const update: Record<string, unknown> = {
      $inc: { usedCount: 1 },
    };

    if (customerPhone) {
      update.$addToSet = { usedByCustomers: customerPhone };
    }

    return this.couponModel
      .findByIdAndUpdate(id, update, { new: true })
      .lean()
      .exec();
  }
}
