import { PlanTier } from '../schemas/subscription-plan.schema';

export interface MerchantStatusResponse {
  status: 'active' | 'inactive' | 'suspended';
  subscription: {
    tier: PlanTier;
    status: 'active' | 'expired' | 'pending';
    startDate: Date;
    endDate?: Date;
  };
  lastActivity?: Date;
  promptStatus: {
    configured: boolean;
    lastUpdated: Date;
  };
}
