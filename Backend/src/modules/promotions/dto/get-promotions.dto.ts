// src/modules/promotions/dto/get-promotions.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

import { PromotionStatus } from '../schemas/promotion.schema';

export class GetPromotionsDto {
  @ApiPropertyOptional({
    description: 'حالة العرض',
    enum: PromotionStatus,
    example: PromotionStatus.ACTIVE,
  })
  @IsEnum(PromotionStatus, { message: 'حالة العرض غير صالحة' })
  @IsOptional()
  status?: PromotionStatus;

  @ApiPropertyOptional({
    description: 'عدد النتائج في الصفحة',
    example: 20,
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'يجب أن يكون الحد رقمياً' })
  @Min(1, { message: 'الحد الأدنى هو 1' })
  @Max(100, { message: 'الحد الأقصى هو 100' })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber({}, { message: 'يجب أن يكون رقم الصفحة رقمياً' })
  @Min(1, { message: 'رقم الصفحة يجب أن يكون على الأقل 1' })
  @IsOptional()
  page?: number = 1;
}
