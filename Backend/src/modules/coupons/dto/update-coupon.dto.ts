// src/modules/coupons/dto/update-coupon.dto.ts
import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

import { CouponStatus } from '../schemas/coupon.schema';

import { CreateCouponDto } from './create-coupon.dto';

export class UpdateCouponDto extends PartialType(
  OmitType(CreateCouponDto, ['merchantId', 'code'] as const),
) {
  @ApiPropertyOptional({
    description: 'حالة الكوبون',
    enum: CouponStatus,
    example: CouponStatus.ACTIVE,
  })
  @IsEnum(CouponStatus, { message: 'حالة الكوبون غير صالحة' })
  @IsOptional()
  status?: CouponStatus;
}
