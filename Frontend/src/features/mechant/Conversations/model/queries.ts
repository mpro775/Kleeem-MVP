// src/features/chat/model/queries.ts
import { useQuery } from "@tanstack/react-query";
import * as api from "../api";
import type { ChannelType } from "@/features/mechant/Conversations/type";

export function useConversations(merchantId?: string, channel?: ChannelType) {
  return useQuery({
    enabled: !!merchantId,
    queryKey: ["chat", "conversations", merchantId, channel ?? "all"],
    queryFn: () => api.listConversations(merchantId!, channel),
    staleTime: 30_000,
  });
}

export function useSessionDetails(sessionId?: string) {
  return useQuery({
    enabled: !!sessionId,
    queryKey: ["chat", "session", sessionId],
    queryFn: () => api.getSessionDetails(sessionId!),
  });
}

export function useMessages(sessionId?: string, merchantId?: string) {
  return useQuery({
    enabled: !!sessionId,
    queryKey: ["chat", "messages", sessionId, merchantId],
    queryFn: () => api.listMessages(sessionId!, merchantId),
    refetchOnWindowFocus: false,
  });
}
