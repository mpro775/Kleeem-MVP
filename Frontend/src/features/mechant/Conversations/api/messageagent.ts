import axiosInstance from "@/shared/api/axios";
import type { ChannelType } from "@/features/mechant/Conversations/type";

export async function sendAgentMessage(payload: {
  merchantId: string;
  sessionId: string;
  channel: ChannelType;
  messages: Array<{ role: "agent"; text: string }>;
  agentId?: string; // لو تريد حفظ رقم معرف الموظف
}) {
  // استخدام axiosInstance للاستفادة من MSW في وضع الديمو
  return axiosInstance.post(
    `/webhooks/agent-reply/${payload.merchantId}`,
    {
      sessionId: payload.sessionId,
      text: payload.messages[0].text,
      channel: payload.channel,
      agentId: payload.agentId,
      // أضف أي حقول أخرى مثل metadata إذا تحتاج
    }
  );
}
