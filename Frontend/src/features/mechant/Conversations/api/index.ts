// src/features/chat/api/index.ts
import * as raw from "@/features/mechant/Conversations/api/messages";          // الملف الذي أرسلته هنا (rate/fetch...)
// إن كان لديك ملف مستقل لرسائل الموظف:
import { sendAgentMessage as sendAgent } from "./messageagent";
import type { ChatMessage,  ChannelType } from "@/features/mechant/Conversations/type";
import axiosInstance from "@/shared/api/axios";

export async function listConversations(merchantId: string, channel?: ChannelType) {
  return raw.fetchConversations(merchantId, channel); // يرجّع ConversationSession[]
}

export async function getSessionDetails(sessionId: string) {
  // Get session details including handover status
  const { data } = await axiosInstance.get(`/messages/session/${sessionId}`);
  return data;
}

export async function listMessages(sessionId: string, merchantId?: string) {
  // جلب الرسائل بدون تحديد channel للسماح بالبحث في جميع القنوات
  // استخدام merchantId من user context أو "" للبحث في جميع المحادثات
  const messages = await raw.fetchSessionMessagesDashboard(merchantId || "", sessionId, undefined);
  return messages as ChatMessage[];
}

export async function setSessionHandover(sessionId: string, handover: boolean) {
  return raw.setSessionHandover(sessionId, handover); // PATCH + handoverToAgent
}

export async function rateMessage(
  sessionId: string, messageId: string, rating: number, feedback?: string
) {
  return raw.rateMessage(sessionId, messageId, rating, feedback); // PATCH
}

export async function sendAgentMessage(params: {
  merchantId: string; sessionId: string; channel: ChannelType;
  messages: Array<{ role: "agent"; text: string }>;
}) {
  // استخدم مسارك الخاص بردّ الموظف
  return sendAgent(params);
}

// (اختياري) لو احتجت إرسال من العميل (الويدجت) استعمل raw.sendMessage:
export const sendCustomerOrBotMessage = raw.sendMessage;
