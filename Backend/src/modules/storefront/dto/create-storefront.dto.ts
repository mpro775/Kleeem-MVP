// src/modules/storefront/dto/create-storefront.dto.ts

import { 
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsEnum,
  IsBoolean,
  IsUrl,
  IsNumber,
  Matches,
  IsIn
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class BannerDto {
  @ApiPropertyOptional({
    description: 'رابط صورة البانر',
    example: 'https://example.com/banner.jpg',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون رابط الصورة نصيًا' })
  @IsUrl({}, { message: 'يجب أن يكون رابط صورة صالح' })
  image?: string;

  @ApiProperty({
    description: 'نص البانر',
    example: 'عروض خاصة لفترة محدودة',
  })
  @IsString({ message: 'يجب أن يكون نص البانر نصيًا' })
  @IsNotEmpty({ message: 'نص البانر مطلوب' })
  text: string;

  @ApiPropertyOptional({
    description: 'رابط البانر (اختياري)',
    example: '/offers/special',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون الرابط نصيًا' })
  url?: string;

  @ApiPropertyOptional({
    description: 'لون خلفية البانر (تنسيق HEX)',
    example: '#FF5733',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون اللون نصيًا' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'يجب أن يكون اللون بتنسيق HEX صالح' })
  color?: string;

  @ApiPropertyOptional({
    description: 'حالة تفعيل البانر',
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'يجب أن تكون الحالة قيمة منطقية' })
  active?: boolean = true;

  @ApiPropertyOptional({
    description: 'ترتيب ظهور البانر',
    minimum: 0,
    default: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'يجب أن يكون الترتيب رقميًا' })
  order?: number = 0;
}

/**
 * نموذج إنشاء واجهة متجر جديدة
 * يحتوي على إعدادات التخصيص الخاصة بواجهة المتجر
 */
export class CreateStorefrontDto {
  @ApiProperty({
    description: 'معرف التاجر',
    example: '60d21b4667d0d8992e610c85',
    required: true,
  })
  @IsString({ message: 'يجب أن يكون معرف التاجر نصيًا' })
  @IsNotEmpty({ message: 'معرف التاجر مطلوب' })
  merchant: string;

  @ApiPropertyOptional({
    description: 'اللون الأساسي لواجهة المتجر (تنسيق HEX)',
    example: '#4F46E5',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون اللون الأساسي نصيًا' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'يجب أن يكون اللون بتنسيق HEX صالح' })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'اللون الثانوي لواجهة المتجر (تنسيق HEX)',
    example: '#7C3AED',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون اللون الثانوي نصيًا' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'يجب أن يكون اللون بتنسيق HEX صالح' })
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: 'شكل الأزرار في الواجهة',
    enum: ['rounded', 'square'],
    example: 'rounded',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون شكل الأزرار نصيًا' })
  @IsIn(['rounded', 'square'], { message: 'يجب أن يكون شكل الأزرار إما rounded أو square' })
  buttonStyle?: string;

  @ApiPropertyOptional({
    description: 'رابط مخصص للمتجر (Slug)',
    example: 'my-store',
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون الرابط المخصص نصيًا' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { 
    message: 'يجب أن يحتوي الرابط المخصص على أحرف لاتينية صغيرة وأرقام وشرطات فقط' 
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'نطاق مخصص للمتجر',
    example: 'store.example.com',
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون النطاق نصيًا' })
  @Matches(/^(?!-)[A-Za-z0-9-]+([\-\.]{1}[a-z0-9]+)*\.[A-Za-z]{2,6}$/, {
    message: 'يجب أن يكون النطاق صالحًا',
  })
  domain?: string;

  @ApiPropertyOptional({
    description: 'قائمة البنرات في الواجهة',
    type: [BannerDto],
  })
  @IsOptional()
  @IsArray({ message: 'يجب أن تكون البنرات مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => BannerDto)
  banners?: BannerDto[];

  @ApiPropertyOptional({
    description: 'قائمة معرفات المنتجات المميزة في الواجهة',
    type: [String],
    example: ['prod-123', 'prod-456'],
  })
  @IsOptional()
  @IsArray({ message: 'يجب أن تكون قائمة المنتجات المميزة مصفوفة' })
  @IsString({ each: true, message: 'يجب أن تكون معرفات المنتجات نصوصًا' })
  featuredProductIds?: string[];
}

export class UpdateStorefrontDto extends CreateStorefrontDto {}
