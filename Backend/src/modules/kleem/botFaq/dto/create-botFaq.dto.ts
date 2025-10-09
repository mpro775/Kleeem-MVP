// src/modules/kleem/botFaq/dto/create-botFaq.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  IsIn,
  ArrayMaxSize,
} from 'class-validator';
import { MAX_LENGTH_FEEDBACK } from 'src/common/constants/common';

export class CreateBotFaqDto {
  @ApiProperty({
    description: 'سؤال FAQ',
    example: 'كيف يمكنني إعادة تعيين كلمة المرور الخاصة بي؟',
    maxLength: 500,
    required: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(500)
  question!: string;

  @ApiProperty({
    description: 'إجابة السؤال',
    example:
      'يمكنك إعادة تعيين كلمة المرور من خلال النقر على "نسيت كلمة المرور" في صفحة تسجيل الدخول.',
    maxLength: MAX_LENGTH_FEEDBACK,
    required: true,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(MAX_LENGTH_FEEDBACK)
  answer!: string;

  @ApiPropertyOptional({
    description: 'مصدر السؤال',
    enum: ['manual', 'auto', 'imported'],
    default: 'manual',
    example: 'manual',
  })
  @IsOptional()
  @IsEnum(['manual', 'auto', 'imported'])
  source?: 'manual' | 'auto' | 'imported';

  @ApiPropertyOptional({
    description: 'وسوم لتصنيف السؤال',
    type: [String],
    example: ['حساب', 'تسجيل دخول'],
    maxItems: 20,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    description: 'لغة السؤال',
    enum: ['ar', 'en'],
    default: 'ar',
    example: 'ar',
  })
  @IsOptional()
  @IsIn(['ar', 'en'])
  locale?: 'ar' | 'en';
}
