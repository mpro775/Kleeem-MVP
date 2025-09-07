export type SystemNotification = {
  kind: 'system';
  id: string;
  type: string;                      // embeddings.completed | catalog.sync.completed | ...
  title: string;
  body?: string;
  severity?: 'info' | 'success' | 'warning' | 'error';
  data?: any;
  ts: number;                        // Date.now()
};

export type ChatNotification = {
  kind: 'chat';
  sessionId: string;
  message: { text: string };
  channel: 'whatsapp' | 'telegram' | 'webchat';
  ts: number;
};

export type AdminNotification = SystemNotification | ChatNotification;