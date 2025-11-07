// src/modules/coupons/dto/create-coupon.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
} from 'class-validator';

import { CouponType } from '../schemas/coupon.schema';

export class CreateCouponDto {
  @ApiProperty({
    description: 'معرّف التاجر',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'يجب أن يكون معرّف التاجر نصياً' })
  @IsNotEmpty({ message: 'معرّف التاجر مطلوب' })
  merchantId!: string;

  @ApiProperty({
    description: 'كود الكوبون',
    example: 'SUMMER2025',
    minLength: 3,
    maxLength: 20,
  })
  @IsString({ message: 'يجب أن يكون كود الكوبون نصياً' })
  @IsNotEmpty({ message: 'كود الكوبون مطلوب' })
  code!: string;

  @ApiPropertyOptional({
    description: 'وصف الكوبون',
    example: 'خصم الصيف 2025',
  })
  @IsString({ message: 'يجب أن يكون الوصف نصياً' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'نوع الخصم',
    enum: CouponType,
    example: CouponType.PERCENTAGE,
  })
  @IsEnum(CouponType, { message: 'نوع الكوبون غير صالح' })
  type!: CouponType;

  @ApiProperty({
    description: 'قيمة الخصم (نسبة مئوية أو مبلغ ثابت)',
    example: 20,
    minimum: 0,
  })
  @IsNumber({}, { message: 'يجب أن تكون القيمة رقمية' })
  @Min(0, { message: 'القيمة يجب أن تكون أكبر من أو تساوي صفر' })
  value!: number;

  @ApiPropertyOptional({
    description: 'الحد الأدنى لمبلغ الطلب',
    example: 100,
    minimum: 0,
  })
  @IsNumber({}, { message: 'يجب أن يكون الحد الأدنى رقمياً' })
  @Min(0, { message: 'الحد الأدنى يجب أن يكون أكبر من أو يساوي صفر' })
  @IsOptional()
  minOrderAmount?: number;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لمبلغ الخصم',
    example: 500,
    minimum: 0,
  })
  @IsNumber({}, { message: 'يجب أن يكون الحد الأقصى رقمياً' })
  @Min(0, { message: 'الحد الأقصى يجب أن يكون أكبر من أو يساوي صفر' })
  @IsOptional()
  maxDiscountAmount?: number | null;

  @ApiPropertyOptional({
    description: 'عدد مرات الاستخدام الكلي (null = غير محدود)',
    example: 100,
    minimum: 1,
  })
  @IsNumber({}, { message: 'يجب أن يكون حد الاستخدام رقمياً' })
  @Min(1, { message: 'حد الاستخدام يجب أن يكون على الأقل 1' })
  @IsOptional()
  usageLimit?: number | null;

  @ApiPropertyOptional({
    description: 'استخدام واحد لكل عميل',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'يجب أن يكون الحقل منطقياً' })
  @IsOptional()
  oneTimePerCustomer?: boolean;

  @ApiPropertyOptional({
    description: 'أرقام هواتف العملاء المسموح لهم',
    example: ['+966501234567', '+966509876543'],
    type: [String],
  })
  @IsArray({ message: 'يجب أن تكون قائمة العملاء مصفوفة' })
  @IsString({ each: true, message: 'يجب أن يكون كل رقم نصياً' })
  @IsOptional()
  allowedCustomers?: string[];

  @ApiPropertyOptional({
    description: 'تطبيق على المتجر كامل',
    example: true,
    default: true,
  })
  @IsBoolean({ message: 'يجب أن يكون الحقل منطقياً' })
  @IsOptional()
  storeWide?: boolean;

  @ApiPropertyOptional({
    description: 'معرّفات المنتجات المحددة',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray({ message: 'يجب أن تكون قائمة المنتجات مصفوفة' })
  @IsString({ each: true, message: 'يجب أن يكون كل معرّف نصياً' })
  @IsOptional()
  products?: string[];

  @ApiPropertyOptional({
    description: 'معرّفات الفئات المحددة',
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    type: [String],
  })
  @IsArray({ message: 'يجب أن تكون قائمة الفئات مصفوفة' })
  @IsString({ each: true, message: 'يجب أن يكون كل معرّف نصياً' })
  @IsOptional()
  categories?: string[];

  @ApiPropertyOptional({
    description: 'تاريخ البداية',
    example: '2025-06-01T00:00:00.000Z',
  })
  @IsDateString({}, { message: 'تاريخ البداية غير صالح' })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'تاريخ الانتهاء',
    example: '2025-09-01T23:59:59.999Z',
  })
  @IsDateString({}, { message: 'تاريخ الانتهاء غير صالح' })
  @IsOptional()
  endDate?: Date;
}
