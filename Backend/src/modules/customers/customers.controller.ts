// src/modules/customers/customers.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Param,
  Patch,
  Query,
  BadRequestException,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Customer as CurrentUser } from '../../common/decorators/customer.decorator';
import { CustomerGuard } from '../../common/guards/customer.guard';
import { IdentityGuard } from '../../common/guards/identity.guard';
import { CustomerRequestUser } from '../../modules/auth/strategies/customer-jwt.strategy';

import { CustomersService } from './customers.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { GetCustomersDto } from './dto/get-customers.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CustomerAddress } from './schemas/customer-address.schema';
import { Customer, SignupSource } from './schemas/customer.schema';

import type { CustomerListResult } from './customers.service';

/** مدة دقيقة واحدة بالميلي ثانية */
const ONE_MINUTE_MS = 60_000;
/** مدة 5 دقائق بالميلي ثانية */
const FIVE_MINUTES_MS = 300_000;

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ========== OTP Endpoints ==========

  @Throttle({ default: { limit: 3, ttl: ONE_MINUTE_MS } })
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'إرسال رمز OTP للعميل' })
  @ApiResponse({ status: 200, description: 'تم إرسال رمز OTP بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 429, description: 'تم تجاوز الحد الأقصى للمحاولات' })
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ message: string }> {
    await this.customersService.sendOtp(
      dto.merchantId,
      dto.contact,
      dto.contactType,
    );

    return {
      message: 'تم إرسال رمز التحقق بنجاح',
    };
  }

  @Throttle({ default: { limit: 5, ttl: FIVE_MINUTES_MS } })
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'التحقق من رمز OTP وإنشاء/تحديث العميل' })
  @ApiResponse({
    status: 200,
    description: 'تم التحقق بنجاح',
    schema: {
      type: 'object',
      properties: {
        customer: {
          type: 'object',
          description: 'بيانات العميل',
        },
        accessToken: {
          type: 'string',
          description: 'رمز الوصول JWT',
        },
        isNewCustomer: {
          type: 'boolean',
          description: 'هل العميل جديد',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'رمز غير صحيح أو منتهي الصلاحية' })
  async verifyOtp(@Body() dto: VerifyOtpDto): Promise<{
    customer: Customer;
    accessToken: string;
    isNewCustomer: boolean;
  }> {
    return this.customersService.verifyOtpAndCreateCustomer(
      dto.merchantId,
      dto.contact,
      dto.contactType,
      dto.code,
    );
  }

  @Post('signup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'تسجيل عميل جديد باستخدام OTP' })
  @ApiResponse({
    status: 200,
    description: 'تم التسجيل بنجاح',
  })
  async signup(@Body() dto: VerifyOtpDto & { name?: string }): Promise<{
    customer: Customer;
    accessToken: string;
    isNewCustomer: boolean;
  }> {
    return this.customersService.verifyOtpAndCreateCustomer(
      dto.merchantId,
      dto.contact,
      dto.contactType,
      dto.code,
      {
        ...(dto.name ? { name: dto.name } : {}),
        signupSource: SignupSource.OTP,
      },
    );
  }

  // ========== Merchant Dashboard CRUD ==========

  @UseGuards(IdentityGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على قائمة العملاء (لوحة التاجر)' })
  @ApiQuery({ type: GetCustomersDto })
  @ApiResponse({
    status: 200,
    description: 'قائمة العملاء',
    schema: {
      type: 'object',
      properties: {
        customers: { type: 'array', description: 'قائمة العملاء' },
        total: { type: 'number', description: 'إجمالي عدد العملاء' },
        page: { type: 'number', description: 'رقم الصفحة الحالية' },
        limit: { type: 'number', description: 'عدد العناصر في الصفحة' },
        totalPages: { type: 'number', description: 'إجمالي عدد الصفحات' },
      },
    },
  })
  async getCustomers(
    @Query() query: GetCustomersDto,
    @Body('merchantId') merchantId: string,
  ): Promise<CustomerListResult> {
    if (query.search) {
      return this.customersService.searchCustomers(
        merchantId,
        query.search,
        query,
      );
    }
    return this.customersService.findAllForMerchant(merchantId, query);
  }

  @UseGuards(IdentityGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على تفاصيل عميل محدد' })
  @ApiResponse({ status: 200, description: 'تفاصيل العميل' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async getCustomer(
    @Param('id') customerId: string,
    @Body('merchantId') merchantId: string,
  ): Promise<Customer> {
    const customer = await this.customersService.findByIdAndMerchant(
      customerId,
      merchantId,
    );
    if (!customer) {
      throw new BadRequestException('العميل غير موجود');
    }
    return customer;
  }

  @UseGuards(IdentityGuard)
  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء عميل جديد يدوياً' })
  @ApiResponse({ status: 201, description: 'تم إنشاء العميل بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  async createCustomer(@Body() dto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.createManualCustomer(dto.merchantId, dto);
  }

  @UseGuards(IdentityGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث بيانات العميل' })
  @ApiResponse({ status: 200, description: 'تم تحديث العميل بنجاح' })
  @ApiResponse({ status: 404, description: 'العميل غير موجود' })
  async updateCustomer(
    @Param('id') customerId: string,
    @Body() dto: UpdateCustomerDto & { merchantId: string },
  ): Promise<Customer> {
    const updatedCustomer = await this.customersService.updateCustomer(
      dto.merchantId,
      customerId,
      dto,
    );
    if (!updatedCustomer) {
      throw new BadRequestException('العميل غير موجود');
    }
    return updatedCustomer;
  }

  @UseGuards(IdentityGuard)
  @Post(':id/tags')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إضافة تاج للعميل' })
  @ApiResponse({ status: 200, description: 'تم إضافة التاج بنجاح' })
  async addTag(
    @Param('id') customerId: string,
    @Body() body: { merchantId: string; tag: string },
  ): Promise<Customer | null> {
    return this.customersService.addTag(body.merchantId, customerId, body.tag);
  }

  @UseGuards(IdentityGuard)
  @Post(':id/tags/remove')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف تاج من العميل' })
  @ApiResponse({ status: 200, description: 'تم حذف التاج بنجاح' })
  async removeTag(
    @Param('id') customerId: string,
    @Body() body: { merchantId: string; tag: string },
  ): Promise<Customer | null> {
    return this.customersService.removeTag(
      body.merchantId,
      customerId,
      body.tag,
    );
  }

  // ========== Storefront APIs ==========

  @UseGuards(CustomerGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على بيانات العميل الحالي (للمتجر)' })
  @ApiResponse({ status: 200, description: 'بيانات العميل' })
  getMyProfile(
    @CurrentUser() customer: CustomerRequestUser,
  ): Customer | undefined {
    // customer.customer من guard مُ typed كـ Customer في CustomerRequestUser
    return customer.customer as Customer;
  }

  @UseGuards(CustomerGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث بيانات العميل الحالي (للمتجر)' })
  @ApiResponse({ status: 200, description: 'تم تحديث البيانات بنجاح' })
  async updateMyProfile(
    @CurrentUser() customer: CustomerRequestUser,
    @Body() updates: { name?: string; marketingConsent?: boolean },
  ): Promise<Customer | null> {
    return this.customersService.updateCustomer(
      customer.merchantId,
      customer.customerId,
      updates,
    );
  }

  // ========== Customer Addresses APIs ==========

  @UseGuards(IdentityGuard)
  @Get(':id/addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على عناوين العميل' })
  @ApiResponse({ status: 200, description: 'قائمة عناوين العميل' })
  async getCustomerAddresses(
    @Param('id') customerId: string,
    @Body('merchantId') merchantId: string,
  ): Promise<CustomerAddress[]> {
    return this.customersService.getCustomerAddresses(merchantId, customerId);
  }

  @UseGuards(IdentityGuard)
  @Post(':id/addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إضافة عنوان للعميل' })
  @ApiResponse({ status: 201, description: 'تم إضافة العنوان بنجاح' })
  async addCustomerAddress(
    @Param('id') customerId: string,
    @Body() body: CreateAddressDto & { merchantId: string },
  ): Promise<CustomerAddress> {
    const { merchantId, ...addressData } = body;
    return this.customersService.createCustomerAddress(
      merchantId,
      customerId,
      addressData,
    );
  }

  @UseGuards(IdentityGuard)
  @Patch(':id/addresses/:addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث عنوان العميل' })
  @ApiResponse({ status: 200, description: 'تم تحديث العنوان بنجاح' })
  async updateCustomerAddress(
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
    @Body() body: UpdateAddressDto & { merchantId: string },
  ): Promise<CustomerAddress | null> {
    const { merchantId, ...updates } = body;
    return this.customersService.updateCustomerAddress(
      merchantId,
      customerId,
      addressId,
      updates,
    );
  }

  @UseGuards(IdentityGuard)
  @Delete(':id/addresses/:addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف عنوان العميل' })
  @ApiResponse({ status: 200, description: 'تم حذف العنوان بنجاح' })
  async deleteCustomerAddress(
    @Param('id') customerId: string,
    @Param('addressId') addressId: string,
    @Body('merchantId') merchantId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.customersService.deleteCustomerAddress(
      merchantId,
      customerId,
      addressId,
    );
    return { success };
  }

  // ========== Storefront Address APIs ==========

  @UseGuards(CustomerGuard)
  @Get('me/addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على عناوين العميل الحالي' })
  @ApiResponse({ status: 200, description: 'قائمة عناوين العميل' })
  async getMyAddresses(
    @CurrentUser() customer: CustomerRequestUser,
  ): Promise<CustomerAddress[]> {
    return this.customersService.getCustomerAddresses(
      customer.merchantId,
      customer.customerId,
    );
  }

  @UseGuards(CustomerGuard)
  @Post('me/addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إضافة عنوان للعميل الحالي' })
  @ApiResponse({ status: 201, description: 'تم إضافة العنوان بنجاح' })
  async addMyAddress(
    @CurrentUser() customer: CustomerRequestUser,
    @Body() addressData: CreateAddressDto,
  ): Promise<CustomerAddress> {
    return this.customersService.createCustomerAddress(
      customer.merchantId,
      customer.customerId,
      addressData,
    );
  }

  @UseGuards(CustomerGuard)
  @Patch('me/addresses/:addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث عنوان العميل الحالي' })
  @ApiResponse({ status: 200, description: 'تم تحديث العنوان بنجاح' })
  async updateMyAddress(
    @CurrentUser() customer: CustomerRequestUser,
    @Param('addressId') addressId: string,
    @Body() updates: UpdateAddressDto,
  ): Promise<CustomerAddress | null> {
    return this.customersService.updateCustomerAddress(
      customer.merchantId,
      customer.customerId,
      addressId,
      updates,
    );
  }

  @UseGuards(CustomerGuard)
  @Delete('me/addresses/:addressId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'حذف عنوان العميل الحالي' })
  @ApiResponse({ status: 200, description: 'تم حذف العنوان بنجاح' })
  async deleteMyAddress(
    @CurrentUser() customer: CustomerRequestUser,
    @Param('addressId') addressId: string,
  ): Promise<{ success: boolean }> {
    const success = await this.customersService.deleteCustomerAddress(
      customer.merchantId,
      customer.customerId,
      addressId,
    );
    return { success };
  }
}
