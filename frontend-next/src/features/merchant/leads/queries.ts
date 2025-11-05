import { useQuery } from '@tanstack/react-query';
import { fetchLeads, fetchLeadsSettings } from './api';

export const leadsKeys = {
  all: ['leads'] as const,
  merchant: (merchantId: string) => [...leadsKeys.all, merchantId] as const,
  settings: (merchantId: string) => [...leadsKeys.merchant(merchantId), 'settings'] as const,
};

export function useLeads(merchantId: string) {
  return useQuery({
    queryKey: leadsKeys.merchant(merchantId),
    queryFn: () => fetchLeads(merchantId),
    enabled: !!merchantId,
    staleTime: 30000,
  });
}

export function useLeadsSettings(merchantId: string) {
  return useQuery({
    queryKey: leadsKeys.settings(merchantId),
    queryFn: () => fetchLeadsSettings(merchantId),
    enabled: !!merchantId,
    staleTime: 60000,
  });
}

