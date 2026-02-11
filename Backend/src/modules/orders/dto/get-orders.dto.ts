import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';

import { MAX_LIMIT } from '../../../common/constants/common';
import { CursorDto } from '../../../common/dto/pagination.dto';

export enum OrderSortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GetOrdersDto extends CursorDto {
  @ApiPropertyOptional({
    description: 'البحث في معرف الجلسة أو بيانات العميل',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'حالة الطلب',
    enum: ['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'],
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'])
  status?: string;

  @ApiPropertyOptional({
    description: 'مصدر الطلب',
    enum: ['manual', 'api', 'imported', 'mini-store', 'widget', 'storefront'],
  })
  @IsOptional()
  @IsEnum(['manual', 'api', 'imported', 'mini-store', 'widget', 'storefront'])
  source?: string;

  @ApiPropertyOptional({
    description: 'معرف الجلسة',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'ترتيب النتائج حسب',
    enum: OrderSortBy,
    default: OrderSortBy.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(OrderSortBy)
  sortBy?: OrderSortBy = OrderSortBy.CREATED_AT;

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}

/** DTO for merchant orders list with offset pagination (page/limit) */
export class ListOrdersDto {
  @ApiPropertyOptional({ description: 'رقم الصفحة', default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? parseInt(value as string, 10) : 1))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة',
    default: 20,
    minimum: 1,
    maximum: MAX_LIMIT,
  })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? parseInt(value as string, 10) : 20))
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'حالة الطلب',
    enum: ['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'],
  })
  @IsOptional()
  @IsEnum(['pending', 'paid', 'canceled', 'shipped', 'delivered', 'refunded'])
  status?: string;

  @ApiPropertyOptional({ description: 'رقم جوال العميل للبحث' })
  @IsOptional()
  @IsString()
  phone?: string;
}
