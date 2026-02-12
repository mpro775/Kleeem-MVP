import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsIn,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';

export class QueryAdminMerchantsDto {
  @ApiPropertyOptional({
    description: 'بحث في الاسم والوصف',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'فلترة حسب حالة التاجر',
    enum: ['active', 'inactive', 'suspended'],
  })
  @IsOptional()
  @IsIn(['active', 'inactive', 'suspended'])
  status?: 'active' | 'inactive' | 'suspended';

  @ApiPropertyOptional({
    description: 'فلترة حسب تفعيل الحساب (ظهور المتجر)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'تضمين التجار المحذوفين (soft-deleted)',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({
    description: 'فلترة حسب مستوى الاشتراك (مثلاً free, pro)',
  })
  @IsOptional()
  @IsString()
  subscriptionTier?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit = 30;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'ترتيب حسب',
    enum: ['createdAt', 'name', 'status', 'updatedAt'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'name', 'status', 'updatedAt'])
  sortBy?: 'createdAt' | 'name' | 'status' | 'updatedAt' = 'createdAt';

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
