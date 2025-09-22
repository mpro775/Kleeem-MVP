// src/merchants/dto/subscription-plan.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsDateString,
  IsOptional,
  IsArray,
  ArrayNotEmpty,
  IsString,
  IsNotEmpty,
} from 'class-validator';

import { PlanTier } from '../../schemas/subscription-plan.schema';

/**
 * خطة اشتراك التاجر
 * @description تحدد مستوى الاشتراك ومزاياه وفترته
 */
export class SubscriptionPlanDto {
  @ApiProperty({
    description: 'مستوى الاشتراك',
    enum: PlanTier,
    example: 'premium',
    required: true,
  })
  @IsEnum(PlanTier, { message: 'يجب تحديد مستوى اشتراك صالح' })
  @IsNotEmpty({ message: 'مستوى الاشتراك مطلوب' })
  tier: PlanTier;

  @ApiProperty({
    description: 'تاريخ بدء الاشتراك (بتنسيق ISO 8601)',
    example: '2025-08-16T00:00:00.000Z',
    required: true,
  })
  @IsDateString({}, { message: 'يجب إدخال تاريخ بدء صالح' })
  @IsNotEmpty({ message: 'تاريخ بدء الاشتراك مطلوب' })
  startDate: string;

  @ApiPropertyOptional({
    description: 'تاريخ انتهاء الاشتراك (بتنسيق ISO 8601) - اختياري',
    example: '2026-08-16T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'يجب إدخال تاريخ انتهاء صالح' })
  endDate?: string;

  @ApiProperty({
    description: 'مميزات الاشتراك',
    type: [String],
    example: ['منتجات غير محدودة', 'دعم فني 24/7', 'تقارير متقدمة'],
    required: true,
  })
  @IsArray({ message: 'يجب أن تكون المميزات مصفوفة' })
  @ArrayNotEmpty({ message: 'يجب تحديد مميزات الاشتراك' })
  @IsString({ each: true, message: 'يجب أن تكون كل ميزة نصية' })
  features: string[];
}
