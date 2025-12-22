// src/modules/customers/customers.service.ts
import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { CUSTOMER_REPOSITORY } from './tokens';
import { CustomerRepository } from './repositories/customer.repository';
import { Customer, SignupSource, ContactType } from './schemas/customer.schema';
import { OtpService } from './services/otp.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { normalizeEmail } from '../../common/utils/email.util';
import { LeadsService } from '../../leads/leads.service';
import { CustomerAddress, AddressLabel } from './schemas/customer-address.schema';
import { CUSTOMER_ADDRESS_REPOSITORY } from './tokens';
import { CustomerAddressRepository } from './repositories/customer-address.repository';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: CustomerRepository,
    @Inject(CUSTOMER_ADDRESS_REPOSITORY)
    private readonly addressRepo: CustomerAddressRepository,
    private readonly otpService: OtpService,
    private readonly jwtService: JwtService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * إرسال OTP للعميل
   */
  async sendOtp(
    merchantId: string,
    contact: string,
    contactType: ContactType,
  ): Promise<void> {
    return this.otpService.sendOtp(merchantId, contact, contactType);
  }

  /**
   * التحقق من OTP وإنشاء/تحديث العميل
   */
  async verifyOtpAndCreateCustomer(
    merchantId: string,
    contact: string,
    contactType: ContactType,
    code: string,
    additionalData?: {
      name?: string;
      signupSource?: SignupSource;
      metadata?: Record<string, unknown>;
    },
  ): Promise<{
    customer: Customer;
    accessToken: string;
    isNewCustomer: boolean;
  }> {
    // التحقق من OTP
    const verificationResult = await this.otpService.verifyOtp(
      merchantId,
      contact,
      contactType,
      code,
    );

    // البحث عن العميل الموجود
    let customer = await this.findByContact(contact, contactType, merchantId);

    const isNewCustomer = !customer;
    if (!customer) {
      // إنشاء عميل جديد
      customer = await this.createCustomer(merchantId, contact, contactType, {
        name: additionalData?.name || `عميل ${contactType === ContactType.EMAIL ? 'بريد إلكتروني' : 'هاتف'}`,
        signupSource: additionalData?.signupSource || SignupSource.OTP,
        metadata: additionalData?.metadata,
      });
    } else {
    // تحديث lastSeenAt للعميل الموجود
    await this.updateLastSeen(customer._id!.toString());

    // تحويل leads المرتبطة بنفس معلومات التواصل
    await this.convertRelatedLeads(merchantId, contact, contactType, customer._id!.toString());
    }

    // إنشاء JWT token للعميل
    const accessToken = await this.generateCustomerToken(customer, merchantId);

    return {
      customer,
      accessToken,
      isNewCustomer,
    };
  }

  /**
   * البحث عن العميل بواسطة معلومات التواصل
   */
  private async findByContact(
    contact: string,
    contactType: ContactType,
    merchantId: string,
  ): Promise<Customer | null> {
    if (contactType === ContactType.EMAIL) {
      return this.customerRepo.findByEmailLower(normalizeEmail(contact)!, merchantId);
    } else {
      return this.customerRepo.findByPhoneNormalized(normalizePhone(contact)!, merchantId);
    }
  }

  /**
   * إنشاء عميل جديد
   */
  private async createCustomer(
    merchantId: string,
    contact: string,
    contactType: ContactType,
    data: {
      name: string;
      signupSource: SignupSource;
      metadata?: Record<string, unknown>;
    },
  ): Promise<Customer> {
    const customerData: Partial<Customer> = {
      merchantId,
      name: data.name,
      signupSource: data.signupSource,
      marketingConsent: false,
      isBlocked: false,
      tags: [],
      metadata: data.metadata || {},
      lastSeenAt: new Date(),
    };

    // إضافة معلومات التواصل
    if (contactType === ContactType.EMAIL) {
      customerData.emailLower = normalizeEmail(contact);
    } else {
      customerData.phoneNormalized = normalizePhone(contact);
    }

    return this.customerRepo.create(customerData);
  }

  /**
   * تحديث lastSeenAt للعميل
   */
  private async updateLastSeen(customerId: string): Promise<void> {
    await this.customerRepo.updateById(customerId, { lastSeenAt: new Date() });
  }

  /**
   * إنشاء JWT token للعميل
   */
  private async generateCustomerToken(customer: Customer, merchantId: string): Promise<string> {
    const payload = {
      customerId: customer._id!.toString(),
      merchantId,
      role: 'CUSTOMER',
      iat: Math.floor(Date.now() / 1000),
    };

    return this.jwtService.signAsync(payload);
  }

  /**
   * البحث عن العميل بالمعرف
   */
  async findById(id: string): Promise<Customer | null> {
    return this.customerRepo.findById(id);
  }

  /**
   * البحث عن العميل بالمعرف والتاجر
   */
  async findByIdAndMerchant(id: string, merchantId: string): Promise<Customer | null> {
    return this.customerRepo.findByIdAndMerchant(id, merchantId);
  }

  /**
   * تحديث بيانات العميل
   */
  async updateCustomer(
    merchantId: string,
    customerId: string,
    updates: Partial<Customer>,
  ): Promise<Customer | null> {
    // التحقق من أن العميل ينتمي للتاجر
    const customer = await this.customerRepo.findByIdAndMerchant(customerId, merchantId);
    if (!customer) {
      throw new BadRequestException('العميل غير موجود أو لا ينتمي لهذا التاجر');
    }

    return this.customerRepo.updateById(customerId, updates);
  }

  /**
   * إضافة تاج للعميل
   */
  async addTag(merchantId: string, customerId: string, tag: string): Promise<Customer | null> {
    const customer = await this.customerRepo.findByIdAndMerchant(customerId, merchantId);
    if (!customer) {
      throw new BadRequestException('العميل غير موجود أو لا ينتمي لهذا التاجر');
    }

    if (customer.tags.includes(tag)) {
      throw new BadRequestException('التاج موجود بالفعل');
    }

    const updatedTags = [...customer.tags, tag];
    return this.customerRepo.updateById(customerId, { tags: updatedTags });
  }

  /**
   * حذف تاج من العميل
   */
  async removeTag(merchantId: string, customerId: string, tag: string): Promise<Customer | null> {
    const customer = await this.customerRepo.findByIdAndMerchant(customerId, merchantId);
    if (!customer) {
      throw new BadRequestException('العميل غير موجود أو لا ينتمي لهذا التاجر');
    }

    const updatedTags = customer.tags.filter(t => t !== tag);
    return this.customerRepo.updateById(customerId, { tags: updatedTags });
  }

  /**
   * البحث والتصفية في العملاء (للتاجر)
   */
  async findAllForMerchant(merchantId: string, filters: any = {}) {
    const customers = await this.customerRepo.findAll(merchantId, filters);
    const total = await this.customerRepo.count(merchantId, filters);

    return {
      customers,
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
      totalPages: Math.ceil(total / (filters.limit || 20)),
    };
  }

  /**
   * البحث النصي في العملاء
   */
  async searchCustomers(merchantId: string, query: string, filters: any = {}) {
    if (!query || query.trim().length < 2) {
      return this.findAllForMerchant(merchantId, filters);
    }

    const customers = await this.customerRepo.search(merchantId, query.trim(), filters);
    return {
      customers,
      total: customers.length,
      page: 1,
      limit: customers.length,
      totalPages: 1,
    };
  }

  /**
   * إنشاء عميل يدوياً (للتاجر)
   */
  async createManualCustomer(merchantId: string, dto: any): Promise<Customer> {
    // التحقق من عدم وجود عميل بنفس البريد أو الهاتف
    if (dto.email) {
      const existingByEmail = await this.customerRepo.findByEmailLower(
        dto.email.toLowerCase().trim(),
        merchantId,
      );
      if (existingByEmail) {
        throw new BadRequestException('يوجد عميل آخر بنفس البريد الإلكتروني');
      }
    }

    if (dto.phone) {
      const existingByPhone = await this.customerRepo.findByPhoneNormalized(
        dto.phone,
        merchantId,
      );
      if (existingByPhone) {
        throw new BadRequestException('يوجد عميل آخر بنفس رقم الهاتف');
      }
    }

    return this.customerRepo.create({
      merchantId,
      name: dto.name,
      emailLower: dto.email ? dto.email.toLowerCase().trim() : undefined,
      phoneNormalized: dto.phone || undefined,
      marketingConsent: dto.marketingConsent || false,
      isBlocked: dto.isBlocked || false,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      signupSource: dto.signupSource || 'manual',
      lastSeenAt: new Date(),
    });
  }

  /**
   * تحديث إحصائيات العميل
   */
  async updateCustomerStats(customerId: string, orderTotal: number): Promise<void> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) return;

    const updatedStats = {
      totalOrders: customer.stats.totalOrders + 1,
      totalSpend: customer.stats.totalSpend + orderTotal,
      lastOrderId: customerId as any, // TODO: should be orderId
    };

    await this.customerRepo.updateById(customerId, { stats: updatedStats });
  }

  /**
   * تحويل leads المرتبطة بنفس معلومات التواصل إلى customers
   */
  private async convertRelatedLeads(
    merchantId: string,
    contact: string,
    contactType: ContactType,
    customerId: string,
  ): Promise<void> {
    try {
      const lead = await this.leadsService.findLeadByContact(
        merchantId,
        contact,
        contactType,
      );

      if (lead) {
        await this.leadsService.convertLeadToCustomer(lead._id!.toString(), customerId);
      }
    } catch (error) {
      // لا نتوقف عن إنشاء العميل بسبب فشل تحويل leads
      console.error('Error converting related leads:', error);
    }
  }

  /**
   * إدارة عناوين العملاء
   */
  async getCustomerAddresses(merchantId: string, customerId: string): Promise<CustomerAddress[]> {
    // التحقق من أن العميل ينتمي للتاجر
    const customer = await this.customerRepo.findByIdAndMerchant(customerId, merchantId);
    if (!customer) {
      throw new BadRequestException('العميل غير موجود');
    }

    return this.addressRepo.findByCustomerId(customerId);
  }

  async createCustomerAddress(
    merchantId: string,
    customerId: string,
    addressData: {
      label: AddressLabel;
      country: string;
      city: string;
      address1: string;
      address2?: string;
      zip?: string;
    },
  ): Promise<CustomerAddress> {
    // التحقق من أن العميل ينتمي للتاجر
    const customer = await this.customerRepo.findByIdAndMerchant(customerId, merchantId);
    if (!customer) {
      throw new BadRequestException('العميل غير موجود');
    }

    return this.addressRepo.create({
      merchantId,
      customerId,
      ...addressData,
    });
  }

  async updateCustomerAddress(
    merchantId: string,
    customerId: string,
    addressId: string,
    updates: Partial<CustomerAddress>,
  ): Promise<CustomerAddress | null> {
    // التحقق من ملكية العنوان
    const address = await this.addressRepo.findById(addressId);
    if (!address || address.customerId.toString() !== customerId || address.merchantId !== merchantId) {
      throw new BadRequestException('العنوان غير موجود أو لا ينتمي لهذا العميل');
    }

    return this.addressRepo.updateById(addressId, updates);
  }

  async deleteCustomerAddress(
    merchantId: string,
    customerId: string,
    addressId: string,
  ): Promise<boolean> {
    // التحقق من ملكية العنوان
    const address = await this.addressRepo.findById(addressId);
    if (!address || address.customerId.toString() !== customerId || address.merchantId !== merchantId) {
      throw new BadRequestException('العنوان غير موجود أو لا ينتمي لهذا العميل');
    }

    return this.addressRepo.deleteById(addressId);
  }

  async setDefaultAddress(
    merchantId: string,
    customerId: string,
    addressId: string,
  ): Promise<void> {
    // التحقق من ملكية العنوان
    const address = await this.addressRepo.findById(addressId);
    if (!address || address.customerId.toString() !== customerId || address.merchantId !== merchantId) {
      throw new BadRequestException('العنوان غير موجود أو لا ينتمي لهذا العميل');
    }

    return this.addressRepo.setDefault(customerId, addressId);
  }
}
