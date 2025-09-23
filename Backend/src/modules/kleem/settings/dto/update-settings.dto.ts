import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsArray,
  ArrayNotEmpty,
  IsDateString,
  IsUrl,
} from 'class-validator';

export class UpdateBotRuntimeSettingsDto {
  @ApiPropertyOptional({
    description: 'تاريخ بدء تشغيل البوت بتنسيق ISO 8601',
    example: '2025-01-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDateString()
  launchDate?: string;

  @ApiPropertyOptional({
    description: 'رابط التقديم',
    example: 'https://example.com/apply',
    type: String,
    format: 'uri',
  })
  @IsOptional()
  @IsUrl()
  applyUrl?: string;

  @ApiPropertyOptional({
    description: 'نص تكاملات الآن',
    example: 'يمكنك دمج أداتنا مع منصتك المفضلة',
    type: String,
  })
  @IsOptional()
  @IsString()
  integrationsNow?: string;

  @ApiPropertyOptional({
    description: 'عرض التجربة المجانية',
    example: 'احصل على 14 يوم تجربة مجانية',
    type: String,
  })
  @IsOptional()
  @IsString()
  trialOffer?: string;

  @ApiPropertyOptional({
    description: 'نص الخطوة التالية لليمن',
    example: 'الخطوة التالية لرواد الأعمال في اليمن',
    type: String,
  })
  @IsOptional()
  @IsString()
  yemenNext?: string;

  @ApiPropertyOptional({
    description: 'نص تحديد الموقع الجغرافي لليمن',
    example: 'نحن نخدم العملاء في جميع أنحاء اليمن',
    type: String,
  })
  @IsOptional()
  @IsString()
  yemenPositioning?: string;

  @ApiPropertyOptional({
    description: 'عدد الرسائل بين كل دعوة للعمل (CTA)',
    example: 3,
    type: Number,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  ctaEvery?: number;

  @ApiPropertyOptional({
    description: 'الكلمات المفتاحية عالية النية',
    example: ['شراء', 'سعر', 'تسجيل', 'اشتراك'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  highIntentKeywords?: string[];

  @ApiPropertyOptional({
    description: 'الكلمات المفتاحية للبيانات الشخصية الحساسة (PII)',
    example: ['رقم الهاتف', 'البريد الإلكتروني', 'العنوان'],
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  piiKeywords?: string[];
}
