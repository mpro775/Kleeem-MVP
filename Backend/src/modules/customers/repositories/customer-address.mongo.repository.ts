// src/modules/customers/repositories/customer-address.mongo.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import {
  CustomerAddress,
  CustomerAddressDocument,
} from '../schemas/customer-address.schema';

import { CustomerAddressRepository } from './customer-address.repository';

@Injectable()
export class CustomerAddressMongoRepository
  implements CustomerAddressRepository
{
  constructor(
    @InjectModel(CustomerAddress.name)
    private addressModel: Model<CustomerAddressDocument>,
  ) {}

  async create(address: Partial<CustomerAddress>): Promise<CustomerAddress> {
    const created = await this.addressModel.create(address);
    return created.toObject();
  }

  async findById(id: string): Promise<CustomerAddress | null> {
    return this.addressModel.findById(id).exec();
  }

  async findByCustomerId(customerId: string): Promise<CustomerAddress[]> {
    return this.addressModel
      .find({ customerId })
      .sort({ isDefault: -1, createdAt: -1 })
      .exec();
  }

  async findDefaultByCustomerId(
    customerId: string,
  ): Promise<CustomerAddress | null> {
    return this.addressModel.findOne({ customerId, isDefault: true }).exec();
  }

  async updateById(
    id: string,
    update: Partial<CustomerAddress>,
  ): Promise<CustomerAddress | null> {
    return this.addressModel
      .findByIdAndUpdate(id, update, { new: true })
      .exec();
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.addressModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async setDefault(customerId: string, addressId: string): Promise<void> {
    // إزالة العلامة الافتراضية من جميع العناوين
    await this.addressModel
      .updateMany({ customerId }, { isDefault: false })
      .exec();

    // تعيين العنوان المحدد كافتراضي
    await this.addressModel
      .findByIdAndUpdate(addressId, { isDefault: true })
      .exec();
  }
}
