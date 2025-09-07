// src/features/widget-config/types.ts
export type EmbedMode = "bubble" | "iframe" | "bar" | "conversational";

export interface ChatWidgetSettings {
  botName?: string;
  brandColor?: string;
  welcomeMessage?: string;
  fontFamily?: string;
  headerBgColor?: string;
  bodyBgColor?: string;
  widgetSlug?: string;
}

export type SettingsView = ChatWidgetSettings & {
  embedMode: EmbedMode;
  shareUrl: string;
};
