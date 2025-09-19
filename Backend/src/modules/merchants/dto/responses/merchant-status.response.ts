// src/merchants/dto/merchant-status.response.ts
import { ApiProperty } from '@nestjs/swagger';
import { PlanTier } from '../../schemas/subscription-plan.schema';

export class MerchantStatusResponse {
  @ApiProperty({ enum: ['active', 'inactive', 'suspended'] })
  status: string;

  @ApiProperty()
  subscription: {
    tier: PlanTier;
    status: string;
    startDate: Date;
    endDate?: Date;
  };

  @ApiProperty({ required: false })
  lastActivity?: Date;

  @ApiProperty()
  promptStatus: {
    configured: boolean;
    lastUpdated: Date;
  };
}
