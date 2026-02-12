// src/modules/products/dto/currency-price.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

const DEFAULT_PRICE = 5000;

import { I18nMessage } from '../../../common/validators/i18n-validator';

/**
 * DTO لتمثيل سعر عملة واحدة
 */
export class CurrencyPriceDto {
  @ApiProperty({
    description: 'السعر بالعملة',
    example: DEFAULT_PRICE,
    minimum: 0,
  })
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  amount!: number;

  @ApiPropertyOptional({
    description: 'هل السعر مُعدّل يدوياً؟',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isManual?: boolean;
}

/**
 * DTO لتعيين سعر يدوي لعملة معينة
 */
export class SetManualPriceDto {
  @ApiProperty({
    description: 'السعر الجديد',
    example: DEFAULT_PRICE,
    minimum: 0,
  })
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  amount!: number;
}

/**
 * DTO لتعيين سعر يدوي مع تحديد العملة
 */
export class CurrencyPriceItemDto {
  @ApiProperty({
    description: 'رمز العملة',
    example: 'SAR',
  })
  @IsString(I18nMessage('validation.string'))
  @IsNotEmpty(I18nMessage('validation.required'))
  currency!: string;

  @ApiProperty({
    description: 'السعر',
    example: DEFAULT_PRICE,
    minimum: 0,
  })
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  amount!: number;

  @ApiPropertyOptional({
    description: 'هل هذا سعر يدوي؟ (افتراضي: true)',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isManual?: boolean;
}

/**
 * DTO لتعيين أسعار متعددة دفعة واحدة
 */
export class BulkSetPricesDto {
  @ApiProperty({
    description: 'قائمة الأسعار للعملات المختلفة',
    type: [CurrencyPriceItemDto],
    example: [
      { currency: 'SAR', amount: DEFAULT_PRICE, isManual: true },
      { currency: 'USD', amount: 20, isManual: true },
    ],
  })
  @IsArray(I18nMessage('validation.array'))
  @ValidateNested({ each: true })
  @Type(() => CurrencyPriceItemDto)
  prices!: CurrencyPriceItemDto[];
}

/**
 * DTO لإعادة تعيين سعر للوضع التلقائي
 */
export class ResetPriceDto {
  @ApiPropertyOptional({
    description: 'هل يتم إعادة حساب السعر من سعر الصرف الحالي؟',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  recalculate?: boolean;
}

/**
 * DTO للاستعلام عن الأسعار بعملة معينة
 */
export class GetPriceQueryDto {
  @ApiPropertyOptional({
    description: 'رمز العملة المطلوبة',
    example: 'SAR',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  currency?: string;

  @ApiPropertyOptional({
    description: 'هل يتم تضمين تفاصيل السعر (isManual, lastSync)؟',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  includeDetails?: boolean;
}

/**
 * DTO للاستجابة بسعر واحد
 */
export class PriceResponseDto {
  @ApiProperty({ description: 'رمز العملة', example: 'SAR' })
  currency!: string;

  @ApiProperty({ description: 'السعر', example: DEFAULT_PRICE })
  amount!: number;

  @ApiPropertyOptional({ description: 'هل السعر يدوي؟', example: false })
  isManual?: boolean;

  @ApiPropertyOptional({ description: 'آخر تزامن تلقائي' })
  lastAutoSync?: Date | null;

  @ApiPropertyOptional({ description: 'تاريخ التعديل اليدوي' })
  manualOverrideAt?: Date | null;
}

/**
 * DTO للاستجابة بجميع الأسعار
 */
export class AllPricesResponseDto {
  @ApiProperty({
    description: 'العملة الأساسية للمنتج',
    example: 'YER',
  })
  baseCurrency!: string;

  @ApiProperty({
    description: 'السعر الأساسي',
    example: DEFAULT_PRICE,
  })
  basePrice!: number;

  @ApiProperty({
    description: 'جميع الأسعار بالعملات المختلفة',
    type: [PriceResponseDto],
  })
  prices!: PriceResponseDto[];
}

/**
 * DTO لتحديث السعر الأساسي
 */
export class UpdateBasePriceDto {
  @ApiProperty({
    description: 'السعر الأساسي الجديد',
    example: DEFAULT_PRICE,
    minimum: 0,
  })
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  basePrice!: number;

  @ApiPropertyOptional({
    description: 'العملة الأساسية (اختياري - يستخدم الافتراضي من التاجر)',
    example: 'YER',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  baseCurrency?: string;

  @ApiPropertyOptional({
    description: 'هل يتم إعادة حساب جميع الأسعار التلقائية؟',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  recalculateAutoPrices?: boolean;
}
