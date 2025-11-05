// Conversation types
export type ChannelType = 'whatsapp' | 'telegram' | 'webchat';
export type Role = 'customer' | 'bot' | 'agent';

export interface ChatMessage {
  role: Role;
  text: string;
  timestamp: string; // ISO date string
  metadata?: Record<string, unknown>;
  _id?: string;
  rating?: 0 | 1 | null; // 0 = سيء، 1 = جيد
  feedback?: string | null; // تعليق التاجر
}

export interface ConversationSession {
  _id: string;
  merchantId: string;
  sessionId: string;
  channel: ChannelType;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export type SessionSummary = {
  sessionId: string;
  channel: ChannelType;
  lastMessageAt: string;
  customerName?: string;
  unread?: number;
};

export type SessionDetails = {
  sessionId: string;
  channel: ChannelType;
  handoverToAgent?: boolean;
};

