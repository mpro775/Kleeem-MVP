// src/modules/merchants/dto/advanced-template.dto.ts
import { Prop } from '@nestjs/mongoose';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { MAX_TEMPLATE_LENGTH } from '../../constants/prompt.constants';

export class AdvancedTemplateDto {
  @ApiPropertyOptional({
    description: 'القالب المتقدّم الكامل (Handlebars/Markdown)',
    example: 'أنت مساعد متجر {{merchantName}}...\n\n',
  })
  @IsOptional()
  @IsString()
  @MaxLength(MAX_TEMPLATE_LENGTH)
  template?: string;

  @Prop({ default: Date.now })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'ملاحظة عن هذه النسخة',
    example: 'تحديث تحية رمضان',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
