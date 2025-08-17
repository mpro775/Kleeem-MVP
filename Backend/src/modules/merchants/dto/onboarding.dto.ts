// src/merchants/dto/onboarding.dto.ts

import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsUrl,
  ValidateNested,
  IsArray,
  ArrayNotEmpty,
} from 'class-validator';
import { AddressDto } from './address.dto';
import { SubscriptionPlanDto } from './subscription-plan.dto';
import { ChannelsDto } from './channel.dto';
import { QuickConfigDto } from './quick-config.dto';

export class OnboardingDto {
  /** اسم المتجر */
  @IsString()
  name: string;

  /** رابط واجهة المتجر (اختياري) */
  @IsOptional()
  @IsUrl()
  storeUrl?: string;

  @IsOptional()
  @IsString()
  customCategory?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  categories?: string[];

  /** رابط شعار المتجر (اختياري) */
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @IsString() // ← أضف هذا
  @IsOptional() // إذا تريد أن يكون اختياري
  phone?: string;
  /** عنوان المتجر (اختياري) */
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  addresses?: AddressDto[];

  /** باقة الاشتراك */
  @ValidateNested()
  @Type(() => SubscriptionPlanDto)
  subscription: SubscriptionPlanDto;

  /** نوع العمل (اختياري) */
  @IsOptional()
  @IsString()
  businessType?: string;

  /** وصف العمل (اختياري) */
  @IsOptional()
  @IsString()
  businessDescription?: string;

  /** إعدادات القنوات (اختياري) */
  @IsOptional()
  @ValidateNested()
  @Type(() => ChannelsDto)
  channels?: ChannelsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuickConfigDto)
  quickConfig?: QuickConfigDto;
}
