import type { Customer } from '../schemas/customer.schema';

export interface CustomerListFilters {
  tags?: string[];
  isBlocked?: boolean;
  signupSource?: 'otp' | 'order' | 'lead' | 'manual';
  sortBy?: 'createdAt' | 'lastSeenAt' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  skip?: number;
  page?: number;
}

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
  findAll(
    merchantId: string,
    filters?: CustomerListFilters,
  ): Promise<Customer[]>;
  updateById(id: string, update: Partial<Customer>): Promise<Customer | null>;
  deleteById(id: string): Promise<boolean>;
  count(merchantId: string, filters?: CustomerListFilters): Promise<number>;
  search(
    merchantId: string,
    query: string,
    filters?: CustomerListFilters,
  ): Promise<Customer[]>;
}
