// src/modules/customers/repositories/customer.mongo.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Customer, CustomerDocument } from '../schemas/customer.schema';
import { CustomerRepository } from './customer.repository';

@Injectable()
export class CustomerMongoRepository implements CustomerRepository {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async create(customer: Partial<Customer>): Promise<Customer> {
    const created = await this.customerModel.create(customer);
    return created.toObject();
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customerModel.findById(id).exec();
  }

  async findByIdAndMerchant(id: string, merchantId: string): Promise<Customer | null> {
    return this.customerModel.findOne({ _id: id, merchantId }).exec();
  }

  async findByEmailLower(emailLower: string, merchantId: string): Promise<Customer | null> {
    return this.customerModel.findOne({ emailLower, merchantId }).exec();
  }

  async findByPhoneNormalized(phoneNormalized: string, merchantId: string): Promise<Customer | null> {
    return this.customerModel.findOne({ phoneNormalized, merchantId }).exec();
  }

  async findByContact(
    contact: string,
    contactType: 'phone' | 'email',
    merchantId: string,
  ): Promise<Customer | null> {
    const query = { merchantId };
    if (contactType === 'email') {
      query['emailLower'] = contact.toLowerCase();
    } else {
      query['phoneNormalized'] = contact;
    }
    return this.customerModel.findOne(query).exec();
  }

  async findAll(merchantId: string, filters?: any): Promise<Customer[]> {
    const query: any = { merchantId };

    if (filters?.tags?.length) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.isBlocked !== undefined) {
      query.isBlocked = filters.isBlocked;
    }

    if (filters?.signupSource) {
      query.signupSource = filters.signupSource;
    }

    const sort: any = { createdAt: -1 };
    if (filters?.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'asc' ? 1 : -1;
    }

    let mongoQuery = this.customerModel.find(query).sort(sort);

    if (filters?.limit) {
      mongoQuery = mongoQuery.limit(filters.limit);
    }

    if (filters?.skip) {
      mongoQuery = mongoQuery.skip(filters.skip);
    }

    return mongoQuery.exec();
  }

  async updateById(id: string, update: Partial<Customer>): Promise<Customer | null> {
    return this.customerModel.findByIdAndUpdate(id, update, { new: true }).exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.customerModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async count(merchantId: string, filters?: any): Promise<number> {
    const query: any = { merchantId };

    if (filters?.tags?.length) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.isBlocked !== undefined) {
      query.isBlocked = filters.isBlocked;
    }

    if (filters?.signupSource) {
      query.signupSource = filters.signupSource;
    }

    return this.customerModel.countDocuments(query).exec();
  }

  async search(merchantId: string, query: string, filters?: any): Promise<Customer[]> {
    const searchQuery: any = {
      merchantId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { emailLower: { $regex: query, $options: 'i' } },
        { phoneNormalized: { $regex: query, $options: 'i' } },
      ],
    };

    if (filters?.tags?.length) {
      searchQuery.tags = { $in: filters.tags };
    }

    return this.customerModel.find(searchQuery).sort({ createdAt: -1 }).limit(50).exec();
  }
}
