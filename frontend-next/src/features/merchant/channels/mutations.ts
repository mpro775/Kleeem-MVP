import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createChannel, updateChannel, deleteChannel } from './api';
import { channelsKeys } from './queries';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';

export function useCreateChannel(merchantId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: createChannel.bind(null, merchantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelsKeys.merchant(merchantId) });
    },
    onError: handleError,
  });
}

export function useUpdateChannel(merchantId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ channelId, partial }: { channelId: string; partial: Partial<any> }) =>
      updateChannel(channelId, partial),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelsKeys.merchant(merchantId) });
    },
    onError: handleError,
  });
}

export function useDeleteChannel(merchantId: string) {
  const queryClient = useQueryClient();
  const { handleError } = useErrorHandler();

  return useMutation({
    mutationFn: ({ channelId, mode }: { channelId: string; mode: 'disable' | 'disconnect' | 'wipe' }) =>
      deleteChannel(channelId, mode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: channelsKeys.merchant(merchantId) });
    },
    onError: handleError,
  });
}

