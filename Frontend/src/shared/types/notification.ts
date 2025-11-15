// shared/types/notification.ts
export type SystemNotification = {
  kind: 'system';
  type: string;                    // ex: embeddings.completed | catalog.sync.completed | ...
  id: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  severity?: 'info' | 'success' | 'warning' | 'error';
  userId?: string;
  merchantId?: string;
  ts: number;                      // Date.now()
};

export type ChatNotification = {
  kind: 'chat';
  sessionId: string;
  message: { text: string };
  channel: 'whatsapp' | 'telegram' | 'webchat';
  ts: number;
};

export type AdminNotification = SystemNotification | ChatNotification;
