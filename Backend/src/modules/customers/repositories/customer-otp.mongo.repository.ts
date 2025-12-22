// src/modules/customers/repositories/customer-otp.mongo.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CustomerOtp, CustomerOtpDocument } from '../schemas/customer-otp.schema';
import { CustomerOtpRepository } from './customer-otp.repository';

@Injectable()
export class CustomerOtpMongoRepository implements CustomerOtpRepository {
  constructor(
    @InjectModel(CustomerOtp.name) private otpModel: Model<CustomerOtpDocument>,
  ) {}

  async create(otp: Partial<CustomerOtp>): Promise<CustomerOtp> {
    const created = await this.otpModel.create(otp);
    return created.toObject();
  }

  async findByContactAndMerchant(
    contact: string,
    contactType: 'phone' | 'email',
    merchantId: string,
  ): Promise<CustomerOtp | null> {
    return this.otpModel
      .findOne({
        contact,
        contactType,
        merchantId,
        expiresAt: { $gt: new Date() },
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findLatestByContactAndMerchant(
    contact: string,
    contactType: 'phone' | 'email',
    merchantId: string,
  ): Promise<CustomerOtp | null> {
    return this.otpModel
      .findOne({
        contact,
        contactType,
        merchantId,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateAttempts(id: string, attempts: number): Promise<CustomerOtp | null> {
    return this.otpModel.findByIdAndUpdate(id, { attempts }, { new: true }).exec();
  }

  async markAsVerified(id: string): Promise<CustomerOtp | null> {
    return this.otpModel.findByIdAndUpdate(
      id,
      { verifiedAt: new Date() },
      { new: true },
    ).exec();
  }

  async deleteExpired(): Promise<number> {
    const result = await this.otpModel.deleteMany({
      expiresAt: { $lt: new Date() },
    }).exec();
    return result.deletedCount;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.otpModel.findByIdAndDelete(id).exec();
    return !!result;
  }
}
