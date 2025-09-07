import axios from "@/shared/api/axios";
import type { ChannelType } from "@/features/mechant/Conversations/type";

export async function sendAgentMessage(payload: {
  merchantId: string;
  sessionId: string;
  channel: ChannelType;
  messages: Array<{ role: "agent"; text: string }>;
  agentId?: string; // لو تريد حفظ رقم معرف الموظف
}) {
  // استبدل URL بباك اندك وليس n8n
  return axios.post(
    `https://api.kaleem-ai.com/api/webhooks/agent-reply/${payload.merchantId}`,
    {
      sessionId: payload.sessionId,
      text: payload.messages[0].text,
      channel: payload.channel,
      agentId: payload.agentId,
      // أضف أي حقول أخرى مثل metadata إذا تحتاج
    }
  );
}
