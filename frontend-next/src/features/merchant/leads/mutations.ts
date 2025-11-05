import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateLeadsSettings } from './api';
import { leadsKeys } from './queries';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import type { LeadsSettings } from './types';

export function useUpdateLeadsSettings(merchantId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (settings: LeadsSettings) => updateLeadsSettings(merchantId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadsKeys.merchant(merchantId) });
    },
    onError: handleError,
  });
}

