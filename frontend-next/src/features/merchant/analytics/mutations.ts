/**
 * Analytics Mutations
 * @description React Query hooks for mutating analytics data
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { skipChecklistItem } from './api';
import { analyticsKeys } from './queries';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

/**
 * Hook to skip checklist item
 */
export function useSkipChecklistItem(merchantId: string | undefined) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: (itemKey: string) =>
      skipChecklistItem(merchantId!, itemKey),
    onSuccess: () => {
      // Invalidate checklist query
      if (merchantId) {
        queryClient.invalidateQueries({
          queryKey: analyticsKeys.checklist(merchantId),
        });
      }
    },
    onError: (error) => {
      handleError(error);
    },
  });
}

