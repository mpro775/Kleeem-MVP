import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsArray,
  IsString,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const FIELD_TYPES = ['name', 'email', 'phone', 'address', 'custom'] as const;

export class LeadFieldDto {
  @ApiProperty({ description: 'معرف الحقل (فريد)', example: 'uuid-key' })
  @IsString()
  key!: string;

  @ApiProperty({
    description: 'نوع الحقل',
    enum: FIELD_TYPES,
    example: 'email',
  })
  @IsEnum(FIELD_TYPES)
  fieldType!: (typeof FIELD_TYPES)[number];

  @ApiPropertyOptional({ description: 'تسمية الحقل', default: '' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({ description: 'نص placeholder', default: '' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({ description: 'مطلوب', default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

export class LeadsSettingsDto {
  @ApiPropertyOptional({
    description: 'تفعيل جمع العملاء المحتملين',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: 'قائمة الحقول المطلوبة في النموذج',
    type: [LeadFieldDto],
    default: [],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeadFieldDto)
  fields?: LeadFieldDto[];
}
