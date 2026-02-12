import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  IsInt,
  Min,
  Max,
  IsIn,
} from 'class-validator';

export class QueryAdminUsageDto {
  @ApiPropertyOptional({
    description: 'مفتاح الشهر YYYY-MM (إن لم يُحدد يُستخدم الشهر الحالي)',
    example: '2025-02',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'monthKey يجب أن يكون بصيغة YYYY-MM',
  })
  monthKey?: string;

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
    enum: ['messagesUsed', 'merchantId', 'usagePercent'],
  })
  @IsOptional()
  @IsIn(['messagesUsed', 'merchantId', 'usagePercent'])
  sortBy?: 'messagesUsed' | 'merchantId' | 'usagePercent' = 'messagesUsed';

  @ApiPropertyOptional({
    description: 'اتجاه الترتيب',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
