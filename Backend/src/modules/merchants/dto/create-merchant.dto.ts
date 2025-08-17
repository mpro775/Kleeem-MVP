import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUrl,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsObject,
  IsMongoId,
  IsNotEmpty,
  IsPhoneNumber,
  MinLength,
  MaxLength,
  IsEnum,
  IsBoolean
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { AddressDto } from './address.dto';
import { SubscriptionPlanDto } from './subscription-plan.dto';
import { QuickConfigDto } from './quick-config.dto';
import { ChannelsDto } from './channel.dto';
import { WorkingHourDto } from './working-hours.dto';
import { AdvancedTemplateDto } from './advanced-template.dto';
import { LeadsSettingsDto } from './leads-settings.dto';

/**
 * بيانات إنشاء تاجر جديد
 * @description يحتوي على جميع البيانات المطلوبة لإنشاء تاجر جديد في النظام
 */
export class CreateMerchantDto {
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
    description: 'رابط شعار التاجر',
    example: 'https://example.com/logo.png',
    format: 'url'
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
  @IsArray({ message: 'يجب أن تكون العناوين مصفوفة' })
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  @ApiProperty({
    description: 'تفاصيل الاشتراك',
    type: () => SubscriptionPlanDto,
    required: true
  })
  @ValidateNested()
  @Type(() => SubscriptionPlanDto)
  subscription: SubscriptionPlanDto;

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
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن تكون الفئة المخصصة نصية' })
  @MaxLength(100, { message: 'يجب أن لا تزيد الفئة المخصصة عن 100 حرف' })
  customCategory?: string;

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
    description: 'نوع النشاط التجاري',
    example: 'شركة تجارية',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون نوع النشاط التجاري نصيًا' })
  @MaxLength(100, { message: 'يجب أن لا يزيد نوع النشاط التجاري عن 100 حرف' })
  businessType?: string;

  @ApiPropertyOptional({
    description: 'وصف النشاط التجاري',
    example: 'متخصصون في بيع الأجهزة الإلكترونية والمنزلية بجودة عالية',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون وصف النشاط التجاري نصيًا' })
  @MaxLength(1000, { message: 'يجب أن لا يزيد وصف النشاط التجاري عن 1000 حرف' })
  businessDescription?: string;

  @ApiPropertyOptional({
    description: 'معرف سير العمل',
    example: '60d0fe4f5311236168a109ca',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن يكون معرف سير العمل نصيًا' })
  workflowId?: string;

  @ApiPropertyOptional({
    description: 'إعدادات سريعة للتاجر',
    type: () => QuickConfigDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickConfigDto)
  quickConfig?: QuickConfigDto;

  @ApiProperty({
    description: 'معرف المستخدم المالك للتاجر',
    example: '60d0fe4f5311236168a109ca',
    required: true
  })
  @IsMongoId({ message: 'معرف المستخدم غير صالح' })
  @IsNotEmpty({ message: 'معرف المستخدم مطلوب' })
  userId!: string;
  @ApiPropertyOptional({
    description: 'الإعدادات المتقدمة الحالية',
    type: () => AdvancedTemplateDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdvancedTemplateDto)
  currentAdvancedConfig?: AdvancedTemplateDto;

  @ApiPropertyOptional({
    description: 'سجل الإعدادات المتقدمة السابقة',
    type: () => [AdvancedTemplateDto],
    required: false
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdvancedTemplateDto)
  advancedConfigHistory?: AdvancedTemplateDto[];

  @ApiPropertyOptional({
    description: 'إعدادات قنوات التواصل',
    type: () => ChannelsDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelsDto)
  channels?: ChannelsDto;

  @ApiPropertyOptional({
    description: 'ساعات العمل',
    type: () => [WorkingHourDto],
    required: false
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  workingHours?: WorkingHourDto[];

  @ApiPropertyOptional({
    description: 'سياسة الإرجاع',
    example: 'يمكن إرجاع المنتج خلال 14 يومًا من تاريخ الشراء',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن تكون سياسة الإرجاع نصية' })
  @MaxLength(2000, { message: 'يجب أن لا تزيد سياسة الإرجاع عن 2000 حرف' })
  returnPolicy?: string;

  @ApiPropertyOptional({
    description: 'روابط وسائل التواصل الاجتماعي',
    type: Object,
    example: {
      twitter: 'https://twitter.com/example',
      facebook: 'https://facebook.com/example'
    },
    required: false
  })
  @IsOptional()
  @IsObject({ message: 'يجب أن تكون روابط وسائل التواصل الاجتماعي كائنًا' })
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'سياسة الاستبدال',
    example: 'يمكن استبدال المنتج خلال 7 أيام من تاريخ الشراء',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن تكون سياسة الاستبدال نصية' })
  @MaxLength(2000, { message: 'يجب أن لا تزيد سياسة الاستبدال عن 2000 حرف' })
  exchangePolicy?: string;

  @ApiPropertyOptional({
    description: 'إعدادات العملاء المحتملين',
    type: () => LeadsSettingsDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LeadsSettingsDto)
  leadsSettings?: LeadsSettingsDto;

  @ApiPropertyOptional({
    description: 'سياسة الشحن',
    example: 'يتم الشحن خلال 3-5 أيام عمل',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'يجب أن تكون سياسة الشحن نصية' })
  @MaxLength(2000, { message: 'يجب أن لا تزيد سياسة الشحن عن 2000 حرف' })
  shippingPolicy?: string;
}
