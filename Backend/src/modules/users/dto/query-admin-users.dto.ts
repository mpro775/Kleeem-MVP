import { Type } from 'class-transformer';
import {
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { UserRole } from '../schemas/user.schema';

export class QueryAdminUsersDto {
  @ApiPropertyOptional({
    description: 'بحث في الاسم والبريد الإلكتروني',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'فلترة حسب دور المستخدم',
    enum: UserRole,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'فلترة حسب تفعيل الحساب',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'تضمين المستخدمين المحذوفين (soft-deleted)',
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  includeDeleted?: boolean;

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
    enum: ['createdAt', 'name', 'email', 'updatedAt'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'name', 'email', 'updatedAt'])
  sortBy?: 'createdAt' | 'name' | 'email' | 'updatedAt' = 'createdAt';

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
