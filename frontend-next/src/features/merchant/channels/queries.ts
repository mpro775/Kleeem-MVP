import { useQuery } from '@tanstack/react-query';
import { fetchChannels } from './api';

export const channelsKeys = {
  all: ['channels'] as const,
  merchant: (merchantId: string) => [...channelsKeys.all, merchantId] as const,
};

export function useChannels(merchantId: string) {
  return useQuery({
    queryKey: channelsKeys.merchant(merchantId),
    queryFn: () => fetchChannels(merchantId),
    enabled: !!merchantId,
    staleTime: 2 * 60 * 1000,
  });
}

