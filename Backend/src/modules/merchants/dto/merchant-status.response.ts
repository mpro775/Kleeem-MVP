// src/merchants/dto/merchant-status.response.ts
import { ApiProperty } from '@nestjs/swagger';
import { PlanTier } from '../schemas/subscription-plan.schema';

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

  @ApiProperty()
  channels: {
    whatsapp: { enabled: boolean; connected: boolean };
    telegram: { enabled: boolean; connected: boolean };
    webchat: { enabled: boolean; connected: boolean };
  };

  @ApiProperty({ required: false })
  lastActivity?: Date;

  @ApiProperty()
  promptStatus: {
    configured: boolean;
    lastUpdated: Date;
  };
}
