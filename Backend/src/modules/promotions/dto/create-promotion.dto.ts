// src/modules/promotions/dto/create-promotion.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Max,
  Min,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  ValidateIf,
} from 'class-validator';

import { PromotionType, ApplyTo } from '../schemas/promotion.schema';

const TIMEOUT_MS = 10000;
export class CreatePromotionDto {
  @ApiProperty({
    description: 'معرّف التاجر',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'يجب أن يكون معرّف التاجر نصياً' })
  @IsNotEmpty({ message: 'معرّف التاجر مطلوب' })
  merchantId!: string;

  @ApiProperty({
    description: 'اسم الحملة الترويجية',
    example: 'خصم نهاية الموسم',
  })
  @IsString({ message: 'يجب أن يكون الاسم نصياً' })
  @IsNotEmpty({ message: 'الاسم مطلوب' })
  name!: string;

  @ApiPropertyOptional({
    description: 'وصف الحملة',
    example: 'خصم 30% على جميع المنتجات',
  })
  @IsString({ message: 'يجب أن يكون الوصف نصياً' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'نوع الخصم',
    enum: PromotionType,
    example: PromotionType.PERCENTAGE,
  })
  @IsEnum(PromotionType, { message: 'نوع العرض غير صالح' })
  type!: PromotionType;

  @ApiProperty({
    description: 'قيمة الخصم (نسبة مئوية أو مبلغ ثابت)',
    example: 30,
    minimum: 0,
  })
  @IsNumber({}, { message: 'يجب أن تكون القيمة رقمية' })
  @Min(0, { message: 'القيمة يجب أن تكون أكبر من أو تساوي صفر' })
  @ValidateIf((o) => o.type === PromotionType.PERCENTAGE)
  @Max(100, { message: 'النسبة المئوية يجب ألا تتجاوز 100%' })
  discountValue!: number;

  @ApiPropertyOptional({
    description: 'الحد الأقصى لمبلغ الخصم',
    example: 500,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون الحد الأقصى رقمياً' })
  @Min(0, { message: 'الحد الأقصى يجب أن يكون أكبر من أو يساوي صفر' })
  maxDiscountAmount?: number | null;

  @ApiPropertyOptional({
    description: 'الحد الأدنى لمبلغ السلة',
    example: 200,
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون الحد الأدنى رقمياً' })
  @Min(0, { message: 'الحد الأدنى يجب أن يكون أكبر من أو يساوي صفر' })
  minCartAmount?: number;

  @ApiProperty({
    description: 'تطبيق على',
    enum: ApplyTo,
    example: ApplyTo.ALL,
    default: ApplyTo.ALL,
  })
  @IsEnum(ApplyTo, { message: 'نطاق التطبيق غير صالح' })
  @IsOptional()
  applyTo?: ApplyTo;

  @ApiPropertyOptional({
    description: 'معرّفات الفئات المحددة',
    example: ['507f1f77bcf86cd799439013', '507f1f77bcf86cd799439014'],
    type: [String],
  })
  @IsArray({ message: 'يجب أن تكون قائمة الفئات مصفوفة' })
  @IsString({ each: true, message: 'يجب أن يكون كل معرّف نصياً' })
  @IsOptional()
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'معرّفات المنتجات المحددة',
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    type: [String],
  })
  @IsArray({ message: 'يجب أن تكون قائمة المنتجات مصفوفة' })
  @IsString({ each: true, message: 'يجب أن يكون كل معرّف نصياً' })
  @IsOptional()
  productIds?: string[];

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

  @ApiPropertyOptional({
    description: 'الأولوية (الأعلى يطبق أولاً)',
    example: 10,
    minimum: 0,
    default: 0,
  })
  @IsNumber({}, { message: 'يجب أن تكون الأولوية رقمية' })
  @Min(0, { message: 'الأولوية يجب أن تكون أكبر من أو تساوي صفر' })
  @IsOptional()
  priority?: number;

  @ApiPropertyOptional({
    description: 'عرض عداد تنازلي',
    example: true,
    default: false,
  })
  @IsBoolean({ message: 'يجب أن يكون الحقل منطقياً' })
  @IsOptional()
  countdownTimer?: boolean;

  @ApiPropertyOptional({
    description: 'عدد مرات الاستخدام الكلي (null = غير محدود)',
    example: TIMEOUT_MS,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون حد الاستخدام رقمياً' })
  @Min(1, { message: 'حد الاستخدام يجب أن يكون على الأقل 1' })
  usageLimit?: number | null;
}
