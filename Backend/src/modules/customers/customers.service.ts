// src/modules/customers/customers.service.ts
import {
  Injectable,
  Inject,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Types } from 'mongoose';

import { normalizeEmail } from '../../common/utils/email.util';
import { normalizePhone } from '../../common/utils/phone.util';
import { LeadsService } from '../leads/leads.service';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { CustomerAddressRepository } from './repositories/customer-address.repository';
import {
  CustomerRepository,
  type CustomerListFilters,
} from './repositories/customer.repository';
import {
  CustomerAddress,
  AddressLabel,
} from './schemas/customer-address.schema';
import { ContactType } from './schemas/customer-otp.schema';
import { Customer, SignupSource } from './schemas/customer.schema';
import { OtpService } from './services/otp.service';
import { CUSTOMER_ADDRESS_REPOSITORY } from './tokens';
import { CUSTOMER_REPOSITORY } from './tokens';

/** فلاتر تستخدم في findAllForMerchant و searchCustomers */
export type CustomerServiceFilters = CustomerListFilters & {
  page?: number;
  search?: string;
};

export interface CustomerListResult {
  customers: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

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
    await this.otpService.verifyOtp(merchantId, contact, contactType, code);

    // البحث عن العميل الموجود
    let customer = await this.findByContact(contact, contactType, merchantId);

    const isNewCustomer = !customer;
    if (!customer) {
      // إنشاء عميل جديد
      customer = await this.createCustomer(merchantId, contact, contactType, {
        name:
          additionalData?.name ||
          `عميل ${contactType === ContactType.EMAIL ? 'بريد إلكتروني' : 'هاتف'}`,
        signupSource: additionalData?.signupSource || SignupSource.OTP,
        ...(additionalData?.metadata
          ? { metadata: additionalData.metadata }
          : {}),
      });
    } else {
      // تحديث lastSeenAt للعميل الموجود
      await this.updateLastSeen(customer._id!.toString());

      // تحويل leads المرتبطة بنفس معلومات التواصل
      await this.convertRelatedLeads(
        merchantId,
        contact,
        contactType,
        customer._id!.toString(),
      );
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
      return this.customerRepo.findByEmailLower(
        normalizeEmail(contact)!,
        merchantId,
      );
    } else {
      return this.customerRepo.findByPhoneNormalized(
        normalizePhone(contact)!,
        merchantId,
      );
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
      const email = normalizeEmail(contact);
      if (email) customerData.emailLower = email;
    } else {
      const phone = normalizePhone(contact);
      if (phone) customerData.phoneNormalized = phone;
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
  private async generateCustomerToken(
    customer: Customer,
    merchantId: string,
  ): Promise<string> {
    const SECONDS_PER_MS = 1000;
    const payload = {
      customerId: customer._id!.toString(),
      merchantId,
      role: 'CUSTOMER',
      iat: Math.floor(Date.now() / SECONDS_PER_MS),
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
  async findByIdAndMerchant(
    id: string,
    merchantId: string,
  ): Promise<Customer | null> {
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
    const customer = await this.customerRepo.findByIdAndMerchant(
      customerId,
      merchantId,
    );
    if (!customer) {
      throw new BadRequestException('العميل غير موجود أو لا ينتمي لهذا التاجر');
    }

    // استبعاد merchantId من التحديث (يُستخدم للتحقق فقط)
    const safeUpdates = { ...updates } as Partial<Customer>;
    delete (safeUpdates as Record<string, unknown>).merchantId;
    return this.customerRepo.updateById(customerId, safeUpdates);
  }

  /**
   * إضافة تاج للعميل
   */
  async addTag(
    merchantId: string,
    customerId: string,
    tag: string,
  ): Promise<Customer | null> {
    const customer = await this.customerRepo.findByIdAndMerchant(
      customerId,
      merchantId,
    );
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
  async removeTag(
    merchantId: string,
    customerId: string,
    tag: string,
  ): Promise<Customer | null> {
    const customer = await this.customerRepo.findByIdAndMerchant(
      customerId,
      merchantId,
    );
    if (!customer) {
      throw new BadRequestException('العميل غير موجود أو لا ينتمي لهذا التاجر');
    }

    const updatedTags = customer.tags.filter((t) => t !== tag);
    return this.customerRepo.updateById(customerId, { tags: updatedTags });
  }

  /**
   * البحث والتصفية في العملاء (للتاجر)
   */
  async findAllForMerchant(
    merchantId: string,
    filters: CustomerServiceFilters = {},
  ): Promise<CustomerListResult> {
    const limit = filters.limit ?? 20;
    const page = filters.page ?? 1;
    const skip = (page - 1) * limit;

    const repoFilters: CustomerListFilters = {
      ...filters,
      limit,
      skip,
    };

    const [customers, total] = await Promise.all([
      this.customerRepo.findAll(merchantId, repoFilters),
      this.customerRepo.count(merchantId, repoFilters),
    ]);

    return {
      customers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * البحث النصي في العملاء
   */
  async searchCustomers(
    merchantId: string,
    query: string,
    filters: CustomerServiceFilters = {},
  ): Promise<CustomerListResult> {
    if (!query || query.trim().length < 2) {
      return this.findAllForMerchant(merchantId, filters);
    }

    const customers = await this.customerRepo.search(
      merchantId,
      query.trim(),
      filters,
    );

    return {
      customers,
      total: customers.length,
      page: 1,
      limit: customers.length,
      totalPages: 1,
    };
  }

  /**
   * التحقق من عدم وجود عميل بنفس البريد أو الهاتف
   */
  private async assertNoDuplicateContact(
    merchantId: string,
    emailLower?: string,
    phoneNormalized?: string,
  ): Promise<void> {
    if (emailLower) {
      const existing = await this.customerRepo.findByEmailLower(
        emailLower,
        merchantId,
      );
      if (existing) {
        throw new BadRequestException('يوجد عميل آخر بنفس البريد الإلكتروني');
      }
    }
    if (phoneNormalized) {
      const existing = await this.customerRepo.findByPhoneNormalized(
        phoneNormalized,
        merchantId,
      );
      if (existing) {
        throw new BadRequestException('يوجد عميل آخر بنفس رقم الهاتف');
      }
    }
  }

  /**
   * إنشاء عميل يدوياً (للتاجر)
   */
  async createManualCustomer(
    merchantId: string,
    dto: CreateCustomerDto,
  ): Promise<Customer> {
    const emailLower = dto.email
      ? (normalizeEmail(dto.email.trim()) ?? dto.email.toLowerCase().trim())
      : undefined;
    const phoneNormalized = dto.phone ? normalizePhone(dto.phone) : undefined;

    await this.assertNoDuplicateContact(
      merchantId,
      emailLower,
      phoneNormalized,
    );

    const customerData: Partial<Customer> = {
      merchantId,
      name: dto.name,
      marketingConsent: dto.marketingConsent === true,
      isBlocked: dto.isBlocked === true,
      tags: Array.isArray(dto.tags) ? dto.tags : [],
      metadata:
        typeof dto.metadata === 'object' && dto.metadata !== null
          ? dto.metadata
          : {},
      signupSource: dto.signupSource ?? SignupSource.MANUAL,
      lastSeenAt: new Date(),
    };
    if (emailLower) customerData.emailLower = emailLower;
    if (phoneNormalized) customerData.phoneNormalized = phoneNormalized;

    return this.customerRepo.create(customerData);
  }

  /**
   * تحديث إحصائيات العميل بعد إنشاء طلب
   */
  async updateCustomerStats(
    customerId: string,
    orderTotal: number,
    orderId?: string,
  ): Promise<void> {
    const customer = await this.customerRepo.findById(customerId);
    if (!customer) return;

    const stats = customer.stats ?? {
      totalOrders: 0,
      totalSpend: 0,
      lastOrderId: null,
    };

    const updatedStats = {
      totalOrders: stats.totalOrders + 1,
      totalSpend: stats.totalSpend + orderTotal,
      lastOrderId: orderId ? new Types.ObjectId(orderId) : stats.lastOrderId,
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

      if (lead && lead._id) {
        await this.leadsService.convertLeadToCustomer(
          lead._id.toString(),
          customerId,
        );
      }
    } catch (error: unknown) {
      // لا نتوقف عن إنشاء العميل بسبب فشل تحويل leads
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.warn(`Error converting related leads: ${errorMessage}`);
    }
  }

  /**
   * إدارة عناوين العملاء
   */
  async getCustomerAddresses(
    merchantId: string,
    customerId: string,
  ): Promise<CustomerAddress[]> {
    // التحقق من أن العميل ينتمي للتاجر
    const customer = await this.customerRepo.findByIdAndMerchant(
      customerId,
      merchantId,
    );
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
    const customer = await this.customerRepo.findByIdAndMerchant(
      customerId,
      merchantId,
    );
    if (!customer) {
      throw new BadRequestException('العميل غير موجود');
    }

    return this.addressRepo.create({
      merchantId,
      customerId: new Types.ObjectId(customerId),
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
    if (
      !address ||
      address.customerId.toString() !== customerId ||
      address.merchantId !== merchantId
    ) {
      throw new BadRequestException(
        'العنوان غير موجود أو لا ينتمي لهذا العميل',
      );
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
    if (
      !address ||
      address.customerId.toString() !== customerId ||
      address.merchantId !== merchantId
    ) {
      throw new BadRequestException(
        'العنوان غير موجود أو لا ينتمي لهذا العميل',
      );
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
    if (
      !address ||
      address.customerId.toString() !== customerId ||
      address.merchantId !== merchantId
    ) {
      throw new BadRequestException(
        'العنوان غير موجود أو لا ينتمي لهذا العميل',
      );
    }

    return this.addressRepo.setDefault(customerId, addressId);
  }
}
