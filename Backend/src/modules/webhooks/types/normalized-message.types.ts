// src/modules/webhooks/types/normalized-message.types.ts
export interface NormalizedMessageMeta {
  channel?: string;
  sourceMessageId?: string;
  [k: string]: unknown;
}

export interface NormalizedIncomingMessage {
  merchantId: string;
  sessionId: string;
  channel: 'telegram' | 'whatsapp' | 'webchat' | 'dashboard-test';
  role: 'customer' | 'bot' | 'agent';
  text: string;
  timestamp: Date | number;
  metadata: NormalizedMessageMeta;

  // attachments
  fileId?: string;
  fileUrl?: string;
  fileName?: string;
  mimeType?: string;
  mediaType?: string;
}

export interface WebhookActionResult {
  sessionId: string;
  action: 'orderDetails' | 'ordersList' | 'askPhone' | 'wait_agent' | 'ask_ai';
  handoverToAgent: boolean;
  role: 'customer' | 'bot' | 'agent';
}
