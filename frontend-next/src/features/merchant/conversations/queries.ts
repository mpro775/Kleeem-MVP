// React Query hooks for conversations
import { useQuery } from '@tanstack/react-query';
import { conversationsApi } from './api';
import type { ChannelType } from './types';

export function useConversations(
  merchantId: string,
  channel?: ChannelType
) {
  return useQuery({
    queryKey: ['conversations', merchantId, channel],
    queryFn: () => conversationsApi.fetchConversations(merchantId, channel),
    enabled: !!merchantId,
  });
}

export function useSessionDetails(sessionId?: string) {
  return useQuery({
    queryKey: ['session-details', sessionId],
    queryFn: () => {
      if (!sessionId) return null;
      // TODO: Implement actual API call
      return Promise.resolve({ handoverToAgent: false });
    },
    enabled: !!sessionId,
  });
}

export function useMessages(sessionId?: string) {
  return useQuery({
    queryKey: ['messages', sessionId],
    queryFn: () => {
      if (!sessionId) return [];
      return conversationsApi.fetchMessages(sessionId);
    },
    enabled: !!sessionId,
  });
}

