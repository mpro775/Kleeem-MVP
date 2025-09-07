// src/features/channels/constants.ts
import type { ReactNode } from "react";

export type ChannelKey =
  | "telegram"
  | "whatsappQr"
  | "webchat"
  | "whatsappApi"
  | "instagram"
  | "messenger";

export type ChannelData = {
  enabled?: boolean;
  // Telegram
  token?: string;
  chatId?: string;
  webhookUrl?: string;

  // WhatsApp QR (Evolution)
  sessionId?: string;
  instanceId?: string;
  status?: string;
  qr?: string;
  phone?: string;

  // WhatsApp Cloud API (Meta)
  accessToken?: string;
  appSecret?: string;
  verifyToken?: string;
  phoneNumberId?: string;
  wabaId?: string;

  // Webchat
  widgetSettings?: Record<string, unknown>;

  [key: string]: unknown;
};

export type ChannelsMap = Record<ChannelKey, ChannelData | undefined>;

export type ChannelDef = {
  key: ChannelKey;
  title: string;
  icon: ReactNode;
  connectVia?: "dialog" | "external" | "none";
};

export const CHANNELS: ChannelDef[] = [
  { key: "telegram", title: "تيليجرام", icon: null, connectVia: "dialog" },
  { key: "whatsappQr", title: "واتساب - QR", icon: null, connectVia: "dialog" },
  {
    key: "whatsappApi",
    title: "واتساب رسمي",
    icon: null,
    connectVia: "dialog",
  },
  { key: "webchat", title: "كليم (ويب شات)", icon: null, connectVia: "dialog" },
  { key: "instagram", title: "إنستجرام", icon: null, connectVia: "none" }, // قريباً
  { key: "messenger", title: "ماسنجر", icon: null, connectVia: "none" }, // قريباً
];

// مساعد لإخفاء التوكن
export function maskToken(v?: string) {
  if (!v) return "";
  return v.length <= 8 ? "••••" : `${v.slice(0, 4)}••••${v.slice(-4)}`;
}
