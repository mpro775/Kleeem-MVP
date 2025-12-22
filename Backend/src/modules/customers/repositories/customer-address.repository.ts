// src/modules/customers/repositories/customer-address.repository.ts
import { CustomerAddress } from '../schemas/customer-address.schema';

export interface CustomerAddressRepository {
  create(address: Partial<CustomerAddress>): Promise<CustomerAddress>;
  findById(id: string): Promise<CustomerAddress | null>;
  findByCustomerId(customerId: string): Promise<CustomerAddress[]>;
  findDefaultByCustomerId(customerId: string): Promise<CustomerAddress | null>;
  updateById(id: string, update: Partial<CustomerAddress>): Promise<CustomerAddress | null>;
  deleteById(id: string): Promise<boolean>;
  setDefault(customerId: string, addressId: string): Promise<void>;
}
