// src/modules/customers/dto/get-customers.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class GetCustomersDto {
  @ApiPropertyOptional({
    description: 'البحث في الاسم، البريد الإلكتروني، رقم الهاتف',
    example: 'أحمد محمد',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'تصفية بالتاجات',
    example: ['VIP', 'loyal'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'تصفية بحالة الحظر',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isBlocked?: boolean;

  @ApiPropertyOptional({
    description: 'تصفية بمصدر التسجيل',
    example: 'otp',
    enum: ['otp', 'order', 'lead', 'manual'],
  })
  @IsOptional()
  @IsIn(['otp', 'order', 'lead', 'manual'])
  signupSource?: 'otp' | 'order' | 'lead' | 'manual';

  @ApiPropertyOptional({
    description: 'ترتيب حسب حقل معين',
    example: 'createdAt',
    enum: ['createdAt', 'lastSeenAt', 'name'],
  })
  @IsOptional()
  @IsIn(['createdAt', 'lastSeenAt', 'name'])
  sortBy?: 'createdAt' | 'lastSeenAt' | 'name';

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'رقم الصفحة (يبدأ من 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'عدد العناصر في الصفحة',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
