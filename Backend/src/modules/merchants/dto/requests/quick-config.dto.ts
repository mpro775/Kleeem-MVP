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
    description: 'تضمين النص الخاتم',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  includeClosingPhrase?: boolean;
  @ApiPropertyOptional({
    description: 'رقم هاتف خدمة العملاء',
    example: '0555555555',
  })
  @IsOptional()
  @IsString()
  customerServicePhone?: string;

  @ApiPropertyOptional({
    description: 'واتساب خدمة العملاء (رابط wa.me أو رقم)',
    example: 'https://wa.me/9665xxxxxxx',
  })
  @IsOptional()
  @IsString()
  customerServiceWhatsapp?: string;

  @ApiPropertyOptional({
    description: 'نص الخاتمة',
    example: 'هل أقدر أساعدك بشي ثاني؟ 😊',
  })
  @IsOptional()
  @IsString()
  closingText?: string;
}
