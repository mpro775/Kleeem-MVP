// src/common/dto/pagination.dto.ts
import { IsOptional, IsPositive, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** DTO للترقيم */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'حقل الترتيب',
  })
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب (asc/desc)',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  @ApiPropertyOptional({
    description: 'كلمة البحث',
  })
  @IsOptional()
  search?: string;
}

/** استجابة الترقيم */
export class PaginatedResponseDto<T> {
  @ApiPropertyOptional()
  data: T[];

  @ApiPropertyOptional()
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
