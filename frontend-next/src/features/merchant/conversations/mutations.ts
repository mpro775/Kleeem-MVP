// React Query mutations for conversations
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { conversationsApi } from './api';
import type { ChannelType } from './types';

export function useRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      sessionId: string;
      messageId: string;
      rating: number;
      feedback?: string;
    }) => conversationsApi.rateMessage(data.sessionId, data.messageId, data.rating, data.feedback),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.sessionId] });
    },
  });
}

export function useHandover(sessionId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handover: boolean) => {
      if (!sessionId) return Promise.reject('No session selected');
      return conversationsApi.setHandover(sessionId, handover);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-details', sessionId] });
    },
  });
}

export function useSendAgentMessage(
  merchantId: string,
  sessionId?: string,
  channel?: ChannelType
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => {
      if (!sessionId || !channel) return Promise.reject('No session or channel');
      return conversationsApi.sendMessage(merchantId, sessionId, channel, text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', merchantId] });
    },
  });
}

