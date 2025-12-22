// src/modules/customers/repositories/customer-otp.repository.ts
import { CustomerOtp } from '../schemas/customer-otp.schema';

export interface CustomerOtpRepository {
  create(otp: Partial<CustomerOtp>): Promise<CustomerOtp>;
  findByContactAndMerchant(
    contact: string,
    contactType: 'phone' | 'email',
    merchantId: string,
  ): Promise<CustomerOtp | null>;
  findLatestByContactAndMerchant(
    contact: string,
    contactType: 'phone' | 'email',
    merchantId: string,
  ): Promise<CustomerOtp | null>;
  updateAttempts(id: string, attempts: number): Promise<CustomerOtp | null>;
  markAsVerified(id: string): Promise<CustomerOtp | null>;
  deleteExpired(): Promise<number>;
  deleteById(id: string): Promise<boolean>;
}
