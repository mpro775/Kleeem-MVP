// src/modules/channels/adapters/channel-adapter.ts
import { ChannelDocument } from '../schemas/channel.schema';

export type ConnectResult =
  | { mode: 'qr'; qr: string; webhookUrl?: string }     // لواتساب QR (نعرض الـ QR، وقد نُرجع الـ webhookUrl أيضًا)
  | { mode: 'webhook'; webhookUrl: string }             // لتليجرام/واتساب Cloud
  | { mode: 'oauth'; redirectUrl: string; state?: string }
  | { mode: 'none' };                                   // لا يوجد إجراء لواجهة المستخدم

export type Status = { status: string; details?: any };

export type WebhookResult = { ok: boolean };

export interface ChannelAdapter {
  connect(c: ChannelDocument, payload?: any): Promise<ConnectResult>;
  disconnect(c: ChannelDocument, mode: 'disable'|'disconnect'|'wipe'): Promise<void>;
  refresh(c: ChannelDocument): Promise<void>;
  getStatus(c: ChannelDocument): Promise<Status>;
  sendMessage(c: ChannelDocument, to: string, text: string): Promise<void>;
  handleWebhook(c: ChannelDocument, raw: any, headers: any): Promise<WebhookResult>;
}