// src/modules/products/dto/attribute-definition.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { I18nMessage } from '../../../common/validators/i18n-validator';
import {
  AttributeStatus,
  AttributeType,
} from '../schemas/attribute-definition.schema';

export class AllowedValueDto {
  @ApiProperty({ example: 'red', description: 'القيمة كـ slug' })
  @IsString(I18nMessage('validation.string'))
  valueSlug!: string;

  @ApiProperty({ example: 'أحمر', description: 'التسمية للعرض' })
  @IsString(I18nMessage('validation.string'))
  label!: string;
}

export class CreateAttributeDefinitionDto {
  @ApiProperty({ example: 'color', description: 'اسم السمة كـ slug' })
  @IsString(I18nMessage('validation.string'))
  keySlug!: string;

  @ApiProperty({ example: 'اللون' })
  @IsString(I18nMessage('validation.string'))
  label!: string;

  @ApiPropertyOptional({
    enum: ['list', 'text', 'number', 'boolean'],
    default: 'list',
  })
  @IsOptional()
  @IsIn(['list', 'text', 'number', 'boolean'], I18nMessage('validation.enum'))
  type?: AttributeType = 'list';

  @ApiPropertyOptional({
    type: [AllowedValueDto],
    description: 'القيم المسموحة (للنوع list فقط)',
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @ValidateNested({ each: true })
  @Type(() => AllowedValueDto)
  allowedValues?: AllowedValueDto[];

  @ApiPropertyOptional({
    description: 'هل تُستخدم كُبعد لإنشاء المتغيرات؟',
    default: false,
  })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isVariantDimension?: boolean;
}

export class UpdateAttributeDefinitionDto {
  @ApiPropertyOptional({ example: 'اللون' })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  label?: string;

  @ApiPropertyOptional({
    enum: ['list', 'text', 'number', 'boolean'],
  })
  @IsOptional()
  @IsIn(['list', 'text', 'number', 'boolean'], I18nMessage('validation.enum'))
  type?: AttributeType;

  @ApiPropertyOptional({
    type: [AllowedValueDto],
    description: 'القيم المسموحة (للنوع list فقط)',
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @ValidateNested({ each: true })
  @Type(() => AllowedValueDto)
  allowedValues?: AllowedValueDto[];

  @ApiPropertyOptional({ description: 'تفعيل كُبعد للمتغيرات' })
  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  isVariantDimension?: boolean;

  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional()
  @IsIn(['active', 'archived'], I18nMessage('validation.enum'))
  status?: AttributeStatus;
}
