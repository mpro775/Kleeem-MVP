// src/modules/customers/repositories/customer.repository.ts
import { CustomerDocument } from '../schemas/customer.schema';

import type { Customer } from '../schemas/customer.schema';

export interface CustomerRepository {
  create(customer: Partial<Customer>): Promise<Customer>;
  findById(id: string): Promise<Customer | null>;
  findByIdAndMerchant(id: string, merchantId: string): Promise<Customer | null>;
  findByEmailLower(
    emailLower: string,
    merchantId: string,
  ): Promise<Customer | null>;
  findByPhoneNormalized(
    phoneNormalized: string,
    merchantId: string,
  ): Promise<Customer | null>;
  findByContact(
    contact: string,
    contactType: 'phone' | 'email',
    merchantId: string,
  ): Promise<Customer | null>;
  findAll(merchantId: string, filters?: any): Promise<Customer[]>;
  updateById(id: string, update: Partial<Customer>): Promise<Customer | null>;
  deleteById(id: string): Promise<boolean>;
  count(merchantId: string, filters?: any): Promise<number>;
  search(merchantId: string, query: string, filters?: any): Promise<Customer[]>;
}
