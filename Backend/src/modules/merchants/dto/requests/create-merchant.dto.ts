import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
  IsBoolean,
  Matches,
} from 'class-validator';

import { I18nMessage } from '../../../../common/validators/i18n-validator';
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_EXCHANGE_POLICY_LENGTH,
  MAX_RETURN_POLICY_LENGTH,
  MAX_SHIPPING_POLICY_LENGTH,
} from '../../constants';
import { AddressDto } from '../shared/address.dto';
import { SubscriptionPlanDto } from '../shared/subscription-plan.dto';
import { WorkingHourDto } from '../shared/working-hours.dto';

import { AdvancedTemplateDto } from './advanced-template.dto';
import { QuickConfigDto } from './quick-config.dto';

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
    required: true,
  })
  @IsString(I18nMessage('validation.string'))
  @IsNotEmpty(I18nMessage('validation.required'))
  @MinLength(3, I18nMessage('validation.minLength'))
  @MaxLength(100, I18nMessage('validation.maxLength'))
  name!: string;

  @ApiPropertyOptional({
    description: 'رابط شعار التاجر',
    example: 'https://example.com/logo.png',
    format: 'url',
  })
  @IsOptional()
  @IsUrl({}, I18nMessage('validation.url'))
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'عناوين التاجر',
    type: () => [AddressDto],
    required: false,
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @ValidateNested({ each: true })
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  @ApiProperty({
    description: 'تفاصيل الاشتراك',
    type: () => SubscriptionPlanDto,
    required: true,
  })
  @ValidateNested()
  @Type(() => SubscriptionPlanDto)
  subscription!: SubscriptionPlanDto;

  @ApiPropertyOptional({
    description: 'فئات المنتجات/الخدمات',
    type: [String],
    example: ['إلكترونيات', 'أجهزة منزلية'],
    required: false,
  })
  @IsOptional()
  @IsArray(I18nMessage('validation.array'))
  @ArrayNotEmpty(I18nMessage('validation.arrayNotEmpty'))
  @IsString(I18nMessage('validation.string', { each: true }))
  categories?: string[];

  @ApiPropertyOptional({
    description: 'فئة مخصصة في حالة عدم وجود الفئة المطلوبة',
    example: 'منتجات فريدة من نوعها',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @MaxLength(100, I18nMessage('validation.maxLength'))
  customCategory?: string;

  @ApiPropertyOptional({
    description: 'رقم هاتف التواصل',
    example: '+966501234567',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @IsPhoneNumber(undefined, I18nMessage('validation.phone'))
  phone?: string;

  @ApiPropertyOptional({
    description: 'نوع النشاط التجاري',
    example: 'شركة تجارية',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @MaxLength(100, I18nMessage('validation.maxLength'))
  businessType?: string;

  @ApiPropertyOptional({
    description: 'وصف النشاط التجاري',
    example: 'متخصصون في بيع الأجهزة الإلكترونية والمنزلية بجودة عالية',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @MaxLength(MAX_DESCRIPTION_LENGTH, I18nMessage('validation.maxLength'))
  businessDescription?: string;

  @ApiPropertyOptional({
    description: 'معرف سير العمل',
    example: '60d0fe4f5311236168a109ca',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  workflowId?: string;

  @ApiPropertyOptional({
    description: 'إعدادات سريعة للتاجر',
    type: () => QuickConfigDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuickConfigDto)
  quickConfig?: QuickConfigDto;

  @ApiProperty({
    description: 'معرف المستخدم المالك للتاجر',
    example: '60d0fe4f5311236168a109ca',
    required: true,
  })
  @IsMongoId(I18nMessage('validation.mongoId'))
  @IsNotEmpty(I18nMessage('validation.required'))
  userId!: string;

  @ApiPropertyOptional({
    description: 'الإعدادات المتقدمة الحالية',
    type: () => AdvancedTemplateDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdvancedTemplateDto)
  currentAdvancedConfig?: AdvancedTemplateDto;

  @ApiPropertyOptional({
    description: 'سجل الإعدادات المتقدمة السابقة',
    type: () => [AdvancedTemplateDto],
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AdvancedTemplateDto)
  advancedConfigHistory?: AdvancedTemplateDto[];

  @ApiPropertyOptional({
    description: 'ساعات العمل',
    type: () => [WorkingHourDto],
    required: false,
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  workingHours?: WorkingHourDto[];

  @ApiPropertyOptional({
    description: 'سياسة الإرجاع',
    example: 'يمكن إرجاع المنتج خلال 14 يومًا من تاريخ الشراء',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @MaxLength(MAX_RETURN_POLICY_LENGTH, I18nMessage('validation.maxLength'))
  returnPolicy?: string;

  @ApiPropertyOptional({
    description: 'روابط وسائل التواصل الاجتماعي',
    type: Object,
    example: {
      twitter: 'https://twitter.com/example',
      facebook: 'https://facebook.com/example',
    },
    required: false,
  })
  @IsOptional()
  @IsObject(I18nMessage('validation.object'))
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'سياسة الاستبدال',
    example: 'يمكن استبدال المنتج خلال 7 أيام من تاريخ الشراء',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @MaxLength(MAX_EXCHANGE_POLICY_LENGTH, I18nMessage('validation.maxLength'))
  exchangePolicy?: string;

  @ApiPropertyOptional({
    description: 'سياسة الشحن',
    example: 'يتم الشحن خلال 3-5 أيام عمل',
    required: false,
  })
  @IsOptional()
  @IsString(I18nMessage('validation.string'))
  @MaxLength(MAX_SHIPPING_POLICY_LENGTH, I18nMessage('validation.maxLength'))
  shippingPolicy?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : (value as string),
  )
  @Matches(
    /^[a-z](?:[a-z0-9-]{1,48}[a-z0-9])$/i,
    I18nMessage('validation.publicSlug'),
  )
  publicSlug?: string;

  @IsOptional()
  @IsBoolean(I18nMessage('validation.boolean'))
  publicSlugEnabled?: boolean;
}
