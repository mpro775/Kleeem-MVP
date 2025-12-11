// src/modules/products/dto/product-variant.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmptyObject,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { I18nMessage } from '../../../common/validators/i18n-validator';

const EXAMPLE_WEIGHT = 250;
const EXAMPLE_PRICE = 99.99;
const EXAMPLE_PRICE_SAR = 75;
const PRICE_SCHEMA = {
  description: 'أسعار المتغير بعملات متعددة (يجب تضمين YER على الأقل)',
  type: 'object',
  example: { YER: EXAMPLE_PRICE, SAR: EXAMPLE_PRICE_SAR },
  additionalProperties: { type: 'number' },
} as const;
const VALIDATION_OBJECT = {
  ...I18nMessage('validation.object'),
  nullable: false,
};

export class CreateVariantDto {
  @ApiProperty({
    description: 'رمز SKU الفريد للمتغير',
    example: 'TSHIRT-RED-L',
  })
  @IsString(I18nMessage('validation.string'))
  sku!: string;

  @ApiPropertyOptional({
    description: 'الباركود',
    example: '1234567890123',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  barcode?: string;

  @ApiProperty({
    description: 'خصائص المتغير (مثل اللون والمقاس)',
    example: { color: 'أحمر', size: 'L' },
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsObject(I18nMessage('validation.object'))
  attributes!: Record<string, string>;

  @ApiProperty(PRICE_SCHEMA)
  @IsNotEmptyObject(VALIDATION_OBJECT)
  @IsObject(VALIDATION_OBJECT)
  prices!: Record<string, number>;

  @ApiProperty({
    description: 'المخزون المتاح',
    example: 100,
  })
  @Type(() => Number)
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  stock!: number;

  @ApiPropertyOptional({
    description: 'عتبة المخزون المنخفض',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'صور المتغير',
    type: [String],
    example: ['https://example.com/image1.jpg'],
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @IsString(I18nMessage('validation.string', { each: true }))
  images?: string[];

  @ApiPropertyOptional({
    description: 'هل المتغير متاح؟',
    example: true,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'الوزن بالجرام',
    example: EXAMPLE_WEIGHT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  weight?: number;
}

export class UpdateVariantDto {
  @ApiPropertyOptional({
    description: 'رمز SKU الفريد للمتغير',
    example: 'TSHIRT-RED-L',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  sku?: string;

  @ApiPropertyOptional({
    description: 'الباركود',
    example: '1234567890123',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  barcode?: string;

  @ApiPropertyOptional({
    description: 'خصائص المتغير',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject(I18nMessage('validation.object'))
  attributes?: Record<string, string>;

  @ApiPropertyOptional(PRICE_SCHEMA)
  @IsOptional()
  @IsNotEmptyObject(VALIDATION_OBJECT)
  @IsObject(VALIDATION_OBJECT)
  prices?: Record<string, number>;

  @ApiPropertyOptional({
    description: 'المخزون المتاح',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  stock?: number;

  @ApiPropertyOptional({
    description: 'عتبة المخزون المنخفض',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  lowStockThreshold?: number;

  @ApiPropertyOptional({
    description: 'صور المتغير',
    type: [String],
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @IsString(I18nMessage('validation.string', { each: true }))
  images?: string[];

  @ApiPropertyOptional({
    description: 'هل المتغير متاح؟',
    example: true,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'الوزن بالجرام',
    example: EXAMPLE_WEIGHT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  weight?: number;
}
