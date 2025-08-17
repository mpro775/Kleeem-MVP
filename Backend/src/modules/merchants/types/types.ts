import { PlanTier } from '../schemas/subscription-plan.schema';

export interface MerchantStatusResponse {
  status: 'active' | 'inactive' | 'suspended';
  subscription: {
    tier: PlanTier;
    status: 'active' | 'expired' | 'pending';
    startDate: Date;
    endDate?: Date;
  };
  channels: {
    whatsapp: { enabled: boolean; connected: boolean };
    telegram: { enabled: boolean; connected: boolean };
    webchat: { enabled: boolean; connected: boolean };
  };
  lastActivity?: Date;
  promptStatus: {
    configured: boolean;
    lastUpdated: Date;
  };
}
