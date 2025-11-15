import type {
  ChannelType,
  ChatMessage,
  ConversationSession,
} from "@/features/mechant/Conversations/type";
import axiosInstance from "@/shared/api/axios";

export async function rateMessage(
  sessionId: string,
  messageId: string,
  rating: number,
  feedback?: string
) {
  return axiosInstance.patch(
    `/messages/session/${sessionId}/messages/${messageId}/rate`,
    { rating, feedback }
  );
}
export async function fetchConversations(
  merchantId: string,
  channel?: ChannelType
): Promise<ConversationSession[]> {
  const { data } = await axiosInstance.get<ConversationSession[] | { data: ConversationSession[] }>(
    "/messages",
    {
      params: { merchantId, channel },
    }
  );
  // Handle both response formats
  if (Array.isArray(data)) {
    return data;
  }
  return data?.data ?? [];
}

export async function fetchWidgetSessionMessages(
  widgetSlug: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const { data } = await axiosInstance.get(
    `/messages/public/${widgetSlug}/webchat/${sessionId}`
  );
  return data?.messages ?? [];
}

export async function fetchSessionMessagesDashboard(
  merchantId: string,
  sessionId: string,
  channel?: ChannelType
): Promise<ChatMessage[]> {
  // لا نمرر channel في params لأننا نريد جميع المحادثات للبحث عن sessionId
  // الـ channel سيتم فلترته في السيرفر إذا لزم الأمر
  const { data } = await axiosInstance.get<ConversationSession[] | { data: ConversationSession[] }>(
    `/messages`,
    {
      params: { merchantId, ...(channel ? { channel } : {}) },
    }
  );
  // بعد normalizePayload، data قد يكون ConversationSession[] مباشرة أو { data: ConversationSession[] }
  const sessions = Array.isArray(data) ? data : (data?.data ?? []);
  const session = sessions.find((s: ConversationSession) => s.sessionId === sessionId);
  return session?.messages ?? [];
}

export async function sendMessage(payload: {
  merchantId?: string; // اختياري الآن
  slug?: string; // ✅ جديد
  sessionId: string;
  channel: ChannelType;
  embedMode?: "bubble" | "iframe" | "bar" | "conversational"; // ✅ جديد
  messages: Array<{ role: "customer" | "bot"; text: string }>;
}) {
  const url = payload.slug
    ? `/webhooks/chat/incoming/${payload.slug}` // ✅ الموحّد
    : `/webhooks/incoming/${payload.merchantId}`; // ⛔️ قديم كتوافق

  return axiosInstance.post(url, {
    sessionId: payload.sessionId,
    text: payload.messages[0].text,
    channel: payload.channel || "webchat",
    embedMode: payload.embedMode, // يوصَل كـ metadata
    messages: payload.messages,
  });
}

export async function setSessionHandover(sessionId: string, handover: boolean) {
  return axiosInstance.patch(`/messages/session/${sessionId}/handover`, {
    handoverToAgent: handover,
  });
}
