export type ChannelKey = 'telegram' | 'whatsappQr' | 'whatsappApi' | 'webchat' | 'instagram' | 'messenger';
export type ChannelProvider = 'telegram' | 'whatsapp_qr' | 'whatsapp_cloud' | 'webchat' | 'instagram' | 'messenger';
export type ChannelStatus = 'connected' | 'pending' | 'disconnected';

export interface ChannelDoc {
  _id: string;
  provider: ChannelProvider;
  enabled?: boolean;
  status?: ChannelStatus;
  webhookUrl?: string;
  accountLabel?: string;
  createdAt?: string;
  updatedAt?: string;
  username?: string;
  phoneNumberId?: string;
  sessionId?: string;
}

export interface Channel {
  key: ChannelKey;
  title: string;
  provider: ChannelProvider;
}

