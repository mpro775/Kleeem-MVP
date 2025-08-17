// src/merchants/dto/quick-config.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class QuickConfigDto {
  @ApiPropertyOptional({ description: 'اللهجة', example: 'خليجي' })
  @IsOptional()
  @IsString()
  dialect?: string;

  @ApiPropertyOptional({ description: 'النغمة', example: 'ودّي' })
  @IsOptional()
  @IsString()
  tone?: string;

  @ApiPropertyOptional({
    description: 'نقاط التوجيه المخصّصة',
    type: [String],
    example: ['إذا سأل عن الفواتير القديمة …'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customInstructions?: string[];

  @ApiPropertyOptional({
    description: 'ترتيب ظهور الأقسام (sections) في الـ prompt',
    type: [String],
    example: ['products', 'instructions', 'categories', 'policies', 'custom'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectionOrder?: string[];

  // —— حقول التبديل الجديدة ——
  @ApiPropertyOptional({
    description: 'عرض رابط المتجر في الـ prompt',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeStoreUrl?: boolean;

  @ApiPropertyOptional({
    description: 'عرض عنوان المتجر في الـ prompt',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeAddress?: boolean;

  @ApiPropertyOptional({
    description: 'عرض السياسات في الـ prompt',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includePolicies?: boolean;

  @ApiPropertyOptional({
    description: 'عرض ساعات العمل في الـ prompt',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeWorkingHours?: boolean;

  @ApiPropertyOptional({
    description: 'عرض نص الخاتمة في الـ prompt',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  includeClosingPhrase?: boolean;

  @ApiPropertyOptional({
    description: 'نص الخاتمة القابل للتخصيص',
    example: 'هل أقدر أساعدك بشي ثاني؟ 😊',
  })
  @IsOptional()
  @IsString()
  closingText?: string;
}
