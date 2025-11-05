export type EmbedMode = "bubble" | "iframe" | "bar" | "conversational";

export interface ChatWidgetSettings {
  botName?: string;
  brandColor?: string;
  welcomeMessage?: string;
  fontFamily?: string;
  headerBgColor?: string;
  bodyBgColor?: string;
  widgetSlug?: string;
  useStorefrontBrand?: boolean;
  theme?: string;
  leadsEnabled?: boolean;
  leadsFormFields?: Array<{
    fieldType: 'name' | 'email' | 'phone' | 'custom';
    label: string;
    placeholder: string;
    required: boolean;
    key: string;
  }>;
  handoffEnabled?: boolean;
  handoffChannel?: 'slack' | 'email' | 'webhook';
  handoffConfig?: Record<string, unknown>;
  topicsTags?: string[];
  sentimentTags?: string[];
  embedMode?: 'bubble' | 'iframe' | 'bar' | 'conversational';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type SettingsView = ChatWidgetSettings & {
  embedMode: EmbedMode;
  shareUrl: string;
};
