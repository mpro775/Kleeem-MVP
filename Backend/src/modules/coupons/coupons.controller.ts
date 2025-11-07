// src/modules/coupons/coupons.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

import {
  ApplyCouponResult,
  CouponsService,
  CouponValidationResult,
} from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { GetCouponsDto } from './dto/get-coupons.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ValidateCouponDto } from './dto/validate-coupon.dto';
import { Coupon } from './schemas/coupon.schema';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء كوبون جديد' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الكوبون بنجاح' })
  @ApiResponse({ status: 409, description: 'الكود موجود مسبقاً' })
  async create(@Body() createCouponDto: CreateCouponDto): Promise<Coupon> {
    return this.couponsService.create(createCouponDto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة كوبونات التاجر' })
  @ApiResponse({ status: 200, description: 'تم الحصول على القائمة بنجاح' })
  async findAll(
    @Query('merchantId') merchantId: string,
    @Query() query: GetCouponsDto,
  ): Promise<{ coupons: Coupon[]; total: number }> {
    return this.couponsService.findAll(merchantId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل كوبون محدد' })
  @ApiParam({ name: 'id', description: 'معرّف الكوبون' })
  @ApiResponse({ status: 200, description: 'تم الحصول على الكوبون بنجاح' })
  @ApiResponse({ status: 404, description: 'الكوبون غير موجود' })
  async findOne(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<Coupon | null> {
    return this.couponsService.findOne(id, merchantId);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'البحث عن كوبون بالكود' })
  @ApiParam({ name: 'code', description: 'كود الكوبون' })
  @ApiResponse({ status: 200, description: 'تم الحصول على الكوبون بنجاح' })
  @ApiResponse({ status: 404, description: 'الكوبون غير موجود' })
  async findByCode(
    @Param('code') code: string,
    @Query('merchantId') merchantId: string,
  ): Promise<Coupon | null> {
    return this.couponsService.findByCode(merchantId, code);
  }

  @Post('validate')
  @ApiOperation({ summary: 'التحقق من صلاحية كوبون' })
  @ApiResponse({ status: 200, description: 'نتيجة التحقق' })
  async validate(
    @Body() validateCouponDto: ValidateCouponDto,
  ): Promise<CouponValidationResult> {
    return this.couponsService.validate(validateCouponDto);
  }

  @Post('apply')
  @ApiOperation({ summary: 'تطبيق كوبون على سلة' })
  @ApiResponse({ status: 200, description: 'تم تطبيق الكوبون بنجاح' })
  @ApiResponse({ status: 400, description: 'الكوبون غير صالح' })
  async apply(
    @Body() validateCouponDto: ValidateCouponDto,
  ): Promise<ApplyCouponResult> {
    return this.couponsService.apply(validateCouponDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث كوبون' })
  @ApiParam({ name: 'id', description: 'معرّف الكوبون' })
  @ApiResponse({ status: 200, description: 'تم تحديث الكوبون بنجاح' })
  @ApiResponse({ status: 404, description: 'الكوبون غير موجود' })
  async update(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
    @Body() updateCouponDto: UpdateCouponDto,
  ): Promise<Coupon | null> {
    return this.couponsService.update(id, merchantId, updateCouponDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف كوبون' })
  @ApiParam({ name: 'id', description: 'معرّف الكوبون' })
  @ApiResponse({ status: 200, description: 'تم حذف الكوبون بنجاح' })
  @ApiResponse({ status: 404, description: 'الكوبون غير موجود' })
  async remove(
    @Param('id') id: string,
    @Query('merchantId') merchantId: string,
  ): Promise<{ message: string }> {
    await this.couponsService.remove(id, merchantId);
    return { message: 'تم حذف الكوبون بنجاح' };
  }

  @Post('generate-codes')
  @ApiOperation({ summary: 'توليد كوبونات عشوائية للحملات' })
  @ApiResponse({ status: 200, description: 'تم توليد الكوبونات بنجاح' })
  async generateCodes(
    @Body('merchantId') merchantId: string,
    @Body('count') count: number,
    @Body('length') length?: number,
  ): Promise<{ codes: string[] }> {
    const codes = await this.couponsService.generateUniqueCodes(
      merchantId,
      count,
      length,
    );
    return { codes };
  }
}
