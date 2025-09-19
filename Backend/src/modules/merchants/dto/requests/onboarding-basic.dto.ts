import { Type } from 'class-transformer';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  ArrayNotEmpty,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  IsNotEmpty
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressDto } from '../shared/address.dto';

/**
 * بيانات التسجيل الأساسية للتاجر
 * @description يحتوي على المعلومات الأساسية المطلوبة لتسجيل تاجر جديد
 */
export class OnboardingBasicDto {
  @ApiProperty({
    description: 'اسم التاجر',
    example: 'متجر الإلكترونيات الحديث',
    minLength: 3,
    maxLength: 100,
    required: true
  })
  @IsString({ message: 'يجب أن يكون اسم التاجر نصيًا' })
  @IsNotEmpty({ message: 'اسم التاجر مطلوب' })
  @MinLength(3, { message: 'يجب أن لا يقل اسم التاجر عن 3 أحرف' })
  @MaxLength(100, { message: 'يجب أن لا يزيد اسم التاجر عن 100 حرف' })
  name: string;

  @ApiPropertyOptional({
    description: 'نوع النشاط التجاري',
    example: 'شركة تجارية',
    maxLength: 100,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون نوع النشاط التجاري نصيًا' })
  @MaxLength(100, { message: 'يجب أن لا يزيد نوع النشاط التجاري عن 100 حرف' })
  businessType?: string;

  @ApiPropertyOptional({
    description: 'وصف النشاط التجاري',
    example: 'متخصصون في بيع الأجهزة الإلكترونية والمنزلية',
    maxLength: 1000,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون وصف النشاط التجاري نصيًا' })
  @MaxLength(1000, { message: 'يجب أن لا يزيد وصف النشاط التجاري عن 1000 حرف' })
  businessDescription?: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف التواصل',
    example: '+966501234567',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون رقم الهاتف نصيًا' })
  @IsPhoneNumber(undefined, { message: 'يجب إدخال رقم هاتف صحيح' })
  phone?: string;

  @ApiPropertyOptional({
    description: 'فئات المنتجات/الخدمات',
    type: [String],
    example: ['إلكترونيات', 'أجهزة منزلية'],
    required: false
  })
  @IsOptional()
  @IsArray({ message: 'يجب أن تكون الفئات مصفوفة' })
  @ArrayNotEmpty({ message: 'يجب أن تحتوي المصفوفة على عنصر واحد على الأقل' })
  @IsString({ each: true, message: 'يجب أن تكون كل فئة نصية' })
  categories?: string[];

  @ApiPropertyOptional({
    description: 'فئة مخصصة في حالة عدم وجود الفئة المطلوبة',
    example: 'منتجات فريدة من نوعها',
    maxLength: 100,
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن تكون الفئة المخصصة نصية' })
  @MaxLength(100, { message: 'يجب أن لا تزيد الفئة المخصصة عن 100 حرف' })
  customCategory?: string;

  @ApiPropertyOptional({
    description: 'رابط شعار التاجر',
    example: 'https://example.com/logo.png',
    format: 'url',
    required: false
  })
  @IsOptional()
  @IsUrl({}, { message: 'يجب إدخال رابط صحيح للشعار' })
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'عناوين التاجر',
    type: () => [AddressDto],
    required: false
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];
}
