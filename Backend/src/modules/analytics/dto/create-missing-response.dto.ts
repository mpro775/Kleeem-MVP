// src/analytics/dto/create-missing-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMissingResponseDto {
  @ApiProperty({ description: 'معرف التاجر', example: 'merchant_123' })
  @IsString()
  merchant: string;

  @ApiProperty({ description: 'القناة التي وردت منها الرسالة', enum: ['telegram', 'whatsapp', 'webchat'], example: 'whatsapp' })
  @IsString()
  channel: 'telegram' | 'whatsapp' | 'webchat';

  @ApiProperty({ description: 'سؤال العميل', example: 'هل يتوفر لديكم هذا المنتج؟' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'رد البوت على سؤال العميل', example: 'عفواً، لم أفهم السؤال.' })
  @IsString()
  botReply: string;

  @ApiProperty({ description: 'معرف الجلسة (اختياري)', required: false, example: 'session_xyz' })
  @IsOptional()
  @IsString()
  sessionId?: string;

  @ApiProperty({ description: 'تحليل الذكاء الاصطناعي للرسالة (اختياري)', required: false, example: 'العميل يستفسر عن توفر منتج.' })
  @IsOptional()
  @IsString()
  aiAnalysis?: string;

  @ApiProperty({ description: 'معرف العميل (اختياري)', required: false, example: 'customer_456' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: 'نوع الاستجابة المسجلة', enum: ['missing_response', 'unavailable_product'], example: 'missing_response' })
  @IsString()
  type: 'missing_response' | 'unavailable_product';

  @ApiProperty({ description: 'ما إذا كانت الاستجابة قد تمت معالجتها أم لا (اختياري)', required: false, example: false })
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}
