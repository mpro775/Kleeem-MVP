import axiosInstance from '@/lib/axios';
import type {
  ChannelType,
  ChatMessage,
  ConversationSession,
  SessionDetails,
} from './types';

// Rate message
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

// Fetch conversations
export async function fetchConversations(
  merchantId: string,
  channel?: ChannelType
): Promise<ConversationSession[]> {
  const { data } = await axiosInstance.get<ConversationSession[]>(
    '/messages',
    {
      params: { merchantId, channel },
    }
  );
  return data;
}

// Fetch session messages
export async function fetchSessionMessages(
  merchantId: string,
  sessionId: string,
  channel: ChannelType = 'webchat'
): Promise<ChatMessage[]> {
  const { data } = await axiosInstance.get<ConversationSession[]>(
    `/messages`,
    {
      params: { merchantId, channel },
    }
  );
  const session = (data || []).find(
    (s: ConversationSession) => s.sessionId === sessionId
  );
  return session?.messages ?? [];
}

// Get session details
export async function getSessionDetails(
  sessionId: string
): Promise<SessionDetails> {
  const { data } = await axiosInstance.get(`/messages/session/${sessionId}`);
  return data;
}

// Set handover
export async function setSessionHandover(
  sessionId: string,
  handover: boolean
) {
  return axiosInstance.patch(`/messages/session/${sessionId}/handover`, {
    handoverToAgent: handover,
  });
}

// Send agent message
export async function sendAgentMessage(payload: {
  merchantId: string;
  sessionId: string;
  channel: ChannelType;
  messages: Array<{ role: 'agent'; text: string }>;
  agentId?: string;
}) {
  return axiosInstance.post(
    `https://api.kaleem-ai.com/api/webhooks/agent-reply/${payload.merchantId}`,
    {
      sessionId: payload.sessionId,
      text: payload.messages[0].text,
      channel: payload.channel,
      agentId: payload.agentId,
    }
  );
}

// Send customer/bot message
export async function sendMessage(payload: {
  merchantId?: string;
  slug?: string;
  sessionId: string;
  channel: ChannelType;
  embedMode?: 'bubble' | 'iframe' | 'bar' | 'conversational';
  messages: Array<{ role: 'customer' | 'bot'; text: string }>;
}) {
  const url = payload.slug
    ? `/webhooks/chat/incoming/${payload.slug}`
    : `/webhooks/incoming/${payload.merchantId}`;

  return axiosInstance.post(url, {
    sessionId: payload.sessionId,
    text: payload.messages[0].text,
    channel: payload.channel || 'webchat',
    embedMode: payload.embedMode,
    messages: payload.messages,
  });
}

