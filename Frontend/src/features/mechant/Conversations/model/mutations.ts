
// src/features/chat/model/mutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ChannelType } from "@/features/mechant/Conversations/type";
import * as api from "../api";

export function useSendAgentMessage(merchantId?: string, sessionId?: string, channel?: ChannelType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) =>
      api.sendAgentMessage({ merchantId: merchantId!, sessionId: sessionId!, channel: channel!, messages: [{ role: "agent", text }] }),
    onSuccess: () => {
      // إعادة جلب الرسائل فوراً بعد الإرسال
      qc.invalidateQueries({ queryKey: ["chat", "messages", sessionId] });
      qc.invalidateQueries({ queryKey: ["chat", "conversations"] });
      
      // في وضع الديمو، إعادة جلب الرسائل بعد تأخير قصير
      const isMockDataEnabled = 
        import.meta.env.VITE_USE_MOCK_DATA === "true" ||
        localStorage.getItem("kaleem_use_mock_data") === "true";
      
      if (isMockDataEnabled && sessionId) {
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ["chat", "messages", sessionId] });
        }, 500);
      }
    },
  });
}

export function useHandover(sessionId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (handover: boolean) => api.setSessionHandover(sessionId!, handover),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chat", "session", sessionId] });
    },
  });
}

export function useRate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, messageId, rating, feedback }: { sessionId: string; messageId: string; rating: number; feedback?: string }) =>
      api.rateMessage(sessionId, messageId, rating, feedback),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["chat", "messages", v.sessionId] });
    },
  });
}
