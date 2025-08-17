// src/modules/merchants/dto/advanced-template.dto.ts
import { Prop } from '@nestjs/mongoose';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AdvancedTemplateDto {
  @ApiPropertyOptional({
    description: 'القالب المتقدّم الكامل (Handlebars/Markdown)',
    example: 'أنت مساعد متجر {{merchantName}}...\n\n',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  template?: string;

  
  @Prop({ default: Date.now })
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'ملاحظة عن هذه النسخة',
    example: 'تحديث تحية رمضان',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
