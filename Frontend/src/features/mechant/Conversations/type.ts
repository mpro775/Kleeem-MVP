// types/chat.ts

export type ChannelType = "whatsapp" | "telegram" | "webchat" | "instagram" | "other";
export type Role = "customer" | "bot" | "agent" | "system";

// types/chat.ts
export interface ChatMessage {
  role: Role;
  text: string;
  timestamp: string; // ISO date string
  metadata?: Record<string, unknown>;
  _id?: string; // أضف _id لو متوفر من الباك اند
  rating?: number | null; // 0 = سيء، 1 = جيد
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
// src/entities/session/model/types.ts

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
