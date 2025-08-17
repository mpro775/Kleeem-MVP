// src/modules/categories/dto/create-category.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ description: 'اسم الفئة', example: 'ملابس' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'معرف التاجر', example: 'm_12345' })
  @IsString()
  merchantId: string;

  @ApiProperty({ description: 'معرف الفئة الأصل (اختياري)', required: false, example: '60f8f8f8f8f8f8f8f8f8f8f8' })
  @IsOptional()
  @IsMongoId()
  parent?: string;

  @ApiProperty({ description: 'وصف الفئة (اختياري)', required: false, example: 'قسم الملابس الرجالية' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'رابط صورة الفئة (اختياري)', required: false, example: 'https://example.com/image.png' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ description: 'الكلمات المفتاحية للفئة (اختياري)', required: false, type: [String], example: ['صيف', 'قطن'] })
  @IsOptional()
  keywords?: string[];
}
