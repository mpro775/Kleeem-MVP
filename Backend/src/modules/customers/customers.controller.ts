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
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { IdentityGuard } from '../../common/guards/identity.guard';
import { CustomerGuard } from '../../common/guards/customer.guard';
import { Customer as CurrentUser } from '../../common/decorators/customer.decorator';
import { CustomerRequestUser } from '../../modules/auth/strategies/customer-jwt.strategy';
import { CustomersService } from './customers.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { GetCustomersDto } from './dto/get-customers.dto';
import { Customer, SignupSource } from './schemas/customer.schema';
import { ContactType } from './schemas/customer-otp.schema';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) { }

  // ========== OTP Endpoints ==========

  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
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

  @Throttle({ default: { limit: 5, ttl: 300000 } }) // 5 attempts per 5 minutes
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
  async verifyOtp(@Body() dto: VerifyOtpDto) {
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
  async signup(@Body() dto: VerifyOtpDto & { name?: string }) {
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
  ) {
    if (query.search) {
      return this.customersService.searchCustomers(merchantId, query.search, query);
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
  ) {
    const customer = await this.customersService.findByIdAndMerchant(customerId, merchantId);
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
  async createCustomer(
    @Body() dto: CreateCustomerDto,
  ) {
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
  ) {
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
  ) {
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
  ) {
    return this.customersService.removeTag(body.merchantId, customerId, body.tag);
  }

  // ========== Storefront APIs ==========

  @UseGuards(CustomerGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'الحصول على بيانات العميل الحالي (للمتجر)' })
  @ApiResponse({ status: 200, description: 'بيانات العميل' })
  async getMyProfile(@CurrentUser() customer: CustomerRequestUser) {
    return customer.customer;
  }

  @UseGuards(CustomerGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تحديث بيانات العميل الحالي (للمتجر)' })
  @ApiResponse({ status: 200, description: 'تم تحديث البيانات بنجاح' })
  async updateMyProfile(
    @CurrentUser() customer: CustomerRequestUser,
    @Body() updates: { name?: string; marketingConsent?: boolean },
  ) {
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
  ) {
    return this.customersService.getCustomerAddresses(merchantId, customerId);
  }

  @UseGuards(IdentityGuard)
  @Post(':id/addresses')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إضافة عنوان للعميل' })
  @ApiResponse({ status: 201, description: 'تم إضافة العنوان بنجاح' })
  async addCustomerAddress(
    @Param('id') customerId: string,
    @Body() body: {
      merchantId: string;
      label: string;
      country: string;
      city: string;
      address1: string;
      address2?: string;
      zip?: string;
    },
  ) {
    const { merchantId, ...addressData } = body;
    return this.customersService.createCustomerAddress(
      merchantId,
      customerId,
      addressData as any, // Cast to any because label is string but needs AddressLabel enum
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
    @Body() body: {
      merchantId: string;
      label?: string;
      country?: string;
      city?: string;
      address1?: string;
      address2?: string;
      zip?: string;
      isDefault?: boolean;
    },
  ) {
    const { merchantId, ...updates } = body;
    return this.customersService.updateCustomerAddress(
      merchantId,
      customerId,
      addressId,
      updates as any,
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
  ) {
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
  async getMyAddresses(@CurrentUser() customer: CustomerRequestUser) {
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
    @Body() addressData: {
      label: string;
      country: string;
      city: string;
      address1: string;
      address2?: string;
      zip?: string;
    },
  ) {
    return this.customersService.createCustomerAddress(
      customer.merchantId,
      customer.customerId,
      addressData as any,
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
    @Body() updates: {
      label?: string;
      country?: string;
      city?: string;
      address1?: string;
      address2?: string;
      zip?: string;
      isDefault?: boolean;
    },
  ) {
    return this.customersService.updateCustomerAddress(
      customer.merchantId,
      customer.customerId,
      addressId,
      updates as any,
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
  ) {
    const success = await this.customersService.deleteCustomerAddress(
      customer.merchantId,
      customer.customerId,
      addressId,
    );
    return { success };
  }
}
