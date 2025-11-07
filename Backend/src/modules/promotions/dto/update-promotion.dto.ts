// src/modules/promotions/dto/update-promotion.dto.ts
import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { PromotionStatus } from '../schemas/promotion.schema';

import { CreatePromotionDto } from './create-promotion.dto';

export class UpdatePromotionDto extends PartialType(
  OmitType(CreatePromotionDto, ['merchantId'] as const),
) {
  @ApiPropertyOptional({
    description: 'حالة العرض',
    enum: PromotionStatus,
    example: PromotionStatus.ACTIVE,
  })
  @IsEnum(PromotionStatus, { message: 'حالة العرض غير صالحة' })
  @IsOptional()
  status?: PromotionStatus;
}
