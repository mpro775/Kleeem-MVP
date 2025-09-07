import axios from "@/shared/api/axios"; // تأكد من مسار الاستيراد الصحيح
import type {
  ChannelType,
  ChatMessage,
  ConversationSession,
} from "@/features/mechant/Conversations/type";

export async function rateMessage(
  sessionId: string,
  messageId: string,
  rating: number,
  feedback?: string
) {
  return axios.patch(
    `/messages/session/${sessionId}/messages/${messageId}/rate`,
    { rating, feedback }
  );
}
export async function fetchConversations(
  merchantId: string,
  channel?: ChannelType
): Promise<ConversationSession[]> {
  const { data } = await axios.get<{ data: ConversationSession[] }>(
    "/messages",
    {
      params: { merchantId, channel },
    }
  );
  return data.data;
}

export async function fetchWidgetSessionMessages(
  widgetSlug: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const { data } = await axios.get(
    `/messages/public/${widgetSlug}/webchat/${sessionId}`
  );
  return data?.messages ?? [];
}

export async function fetchSessionMessagesDashboard(
  merchantId: string,
  sessionId: string,
  channel: ChannelType = "webchat"
): Promise<ChatMessage[]> {
  const { data } = await axios.get<{ data: ConversationSession[] }>(
    `/messages`,
    {
      params: { merchantId, channel },
    }
  );
  const session = (data.data || []).find((s) => s.sessionId === sessionId);
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

  return axios.post(url, {
    sessionId: payload.sessionId,
    text: payload.messages[0].text,
    channel: payload.channel || "webchat",
    embedMode: payload.embedMode, // يوصَل كـ metadata
    messages: payload.messages,
  });
}

export async function setSessionHandover(sessionId: string, handover: boolean) {
  return axios.patch(`/messages/session/${sessionId}/handover`, {
    handoverToAgent: handover,
  });
}
