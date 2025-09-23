// src/modules/merchants/types/merchant-checklist.types.ts
import type { ChannelStatus } from '../../channels/schemas/channel.schema';

export type ProductSource = 'internal' | 'salla' | 'zid';

export interface MinimalChannel {
  enabled: boolean;
  status: ChannelStatus;
}

export interface AddressLite {
  street?: string;
  city?: string;
  country?: string;
}

export interface WorkingHourLite {
  openTime?: string;
  closeTime?: string;
}

export interface ProductSourceConfig {
  salla?: { active?: boolean };
  zid?: { active?: boolean };
}

export interface QuickConfigLite {
  dialect?: string;
  tone?: string;
  includeClosingPhrase?: boolean;
  closingText?: string;
  customInstructions?: string[];
}

export interface MinimalMerchant {
  publicSlug?: string;
  publicSlugEnabled?: boolean;
  logoUrl?: string;
  addresses?: AddressLite[];
  workingHours?: WorkingHourLite[];
  returnPolicy?: string;
  exchangePolicy?: string;
  shippingPolicy?: string;
  quickConfig?: QuickConfigLite;
  skippedChecklistItems?: string[];
  productSourceConfig?: ProductSourceConfig;
}

export interface ChecklistItem {
  key:
    | 'logo'
    | 'address'
    | 'publicSlug'
    | 'channel_whatsapp_qr'
    | 'channel_whatsapp_api'
    | 'channel_telegram'
    | 'channel_webchat'
    | 'quickConfig_dialect'
    | 'quickConfig_tone'
    | 'quickConfig_closing'
    | 'quickConfig_customInstructions'
    | 'categories'
    | 'configureProducts'
    | 'banners'
    | 'syncExternal'
    | 'workingHours'
    | 'returnPolicy'
    | 'exchangePolicy'
    | 'shippingPolicy';
  title: string;
  isComplete: boolean;
  message?: string;
  actionPath: string;
  skippable: boolean;
  isSkipped?: boolean;
}

export interface ChecklistGroup {
  key: 'storeInfo' | 'channels' | 'quickConfig' | 'misc';
  title: string;
  items: ChecklistItem[];
}

// ---- constants (لا أرقام/مسارات سحرية) ----
export const ACTION_PATHS = {
  merchantInfo: '/dashboard/marchinfo',
  merchantInfoShipping: '/dashboard/marchinfos',
  channels: '/dashboard/channels',
  prompt: '/dashboard/prompt',
  category: '/dashboard/category',
  createProduct: '/dashboard/products/new',
  banners: '/dashboard/banners',
  sync: '/onboarding/sync',
} as const;

export const CHECK_KEYS = {
  logo: 'logo',
  address: 'address',
  publicSlug: 'publicSlug',
  channelWhatsappQr: 'channel_whatsapp_qr',
  channelWhatsappApi: 'channel_whatsapp_api',
  channelTelegram: 'channel_telegram',
  channelWebchat: 'channel_webchat',
  quickDialect: 'quickConfig_dialect',
  quickTone: 'quickConfig_tone',
  quickClosing: 'quickConfig_closing',
  quickCustomInstructions: 'quickConfig_customInstructions',
  categories: 'categories',
  configureProducts: 'configureProducts',
  banners: 'banners',
  syncExternal: 'syncExternal',
  workingHours: 'workingHours',
  returnPolicy: 'returnPolicy',
  exchangePolicy: 'exchangePolicy',
  shippingPolicy: 'shippingPolicy',
} as const;

// utilities
export function hasNonEmptyString(v?: string): boolean {
  return typeof v === 'string' && v.trim().length > 0;
}
