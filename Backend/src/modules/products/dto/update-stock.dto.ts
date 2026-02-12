// src/modules/products/dto/update-stock.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

import { I18nMessage } from '../../../common/validators/i18n-validator';

const DEFAULT_STOCK_QUANTITY = 50;

/**
 * DTO لتحديث مخزون منتج واحد
 */
export class UpdateStockDto {
  @ApiProperty({
    description: 'الكمية الجديدة للمخزون',
    example: DEFAULT_STOCK_QUANTITY,
    minimum: 0,
  })
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'SKU للمتغير (إذا كان المنتج يحتوي متغيرات)',
    example: 'TSHIRT-RED-L',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  variantSku?: string;

  @ApiPropertyOptional({
    description: 'سبب التغيير (للتوثيق)',
    example: 'وصول شحنة جديدة',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  reason?: string;
}

/**
 * عنصر واحد في التحديث الجماعي
 */
export class UpdateStockItemDto {
  @ApiProperty({
    description: 'معرف المنتج',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString(I18nMessage('validation.string'))
  productId!: string;

  @ApiProperty({
    description: 'الكمية الجديدة للمخزون',
    example: DEFAULT_STOCK_QUANTITY,
    minimum: 0,
  })
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(0, I18nMessage('validation.min'))
  @Type(() => Number)
  quantity!: number;

  @ApiPropertyOptional({
    description: 'SKU للمتغير (إذا كان المنتج يحتوي متغيرات)',
    example: 'TSHIRT-RED-L',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  variantSku?: string;

  @ApiPropertyOptional({
    description: 'سبب التغيير (للتوثيق)',
    example: 'جرد المخزون',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  reason?: string;
}

/**
 * DTO للتحديث الجماعي للمخزون
 */
export class BulkUpdateStockDto {
  @ApiProperty({
    description: 'قائمة عناصر المخزون للتحديث',
    type: [UpdateStockItemDto],
  })
  @IsArray(I18nMessage('validation.array'))
  @ValidateNested({ each: true })
  @Type(() => UpdateStockItemDto)
  items!: UpdateStockItemDto[];
}

/**
 * فلاتر جلب المخزون
 */
export class InventoryQueryDto {
  @ApiPropertyOptional({
    description: 'فلترة حسب حالة المخزون',
    enum: ['all', 'low', 'out', 'unlimited', 'available'],
    example: 'all',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  status?: 'all' | 'low' | 'out' | 'unlimited' | 'available';

  @ApiPropertyOptional({
    description: 'البحث بالاسم',
    example: 'تيشيرت',
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  search?: string;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة',
    example: 20,
  })
  @IsOptional()
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(1, I18nMessage('validation.min'))
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
  })
  @IsOptional()
  @IsNumber({}, I18nMessage('validation.number'))
  @Min(1, I18nMessage('validation.min'))
  @Type(() => Number)
  page?: number;
}
