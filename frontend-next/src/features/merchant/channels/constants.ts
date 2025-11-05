import type { Channel } from './types';

export const CHANNELS: Channel[] = [
  { key: 'telegram', title: 'تيليجرام', provider: 'telegram' },
  { key: 'whatsappQr', title: 'واتساب QR', provider: 'whatsapp_qr' },
  { key: 'whatsappApi', title: 'واتساب API', provider: 'whatsapp_cloud' },
  { key: 'webchat', title: 'ويب شات', provider: 'webchat' },
  { key: 'instagram', title: 'إنستجرام', provider: 'instagram' },
  { key: 'messenger', title: 'ماسنجر', provider: 'messenger' },
];

