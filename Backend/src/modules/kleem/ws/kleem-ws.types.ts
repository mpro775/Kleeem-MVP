// src/modules/kleem/ws/kleem-ws.types.ts
export type KleemRole = 'user' | 'bot';
export type KleemAdminRole = 'admin' | 'agent' | 'guest';

export interface KleemWsMessage {
  role: KleemRole;
  text: string;
  msgIdx?: number;
  metadata?: Record<string, unknown>;
  timestamp?: string;
}

export interface UserMessagePayload {
  sessionId: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface TypingPayload {
  sessionId: string;
  role: KleemRole; // 'user' | 'bot'
}

/** ما يرسله السيرفر للعميل */
export interface ServerToClientEvents {
  // محادثة
  bot_reply: KleemWsMessage;
  message: KleemWsMessage;
  typing: TypingPayload;
  bot_chunk: { sessionId: string; delta: string };
  bot_done: { sessionId: string };

  // إشعارات
  notification: any; // للمستخدم/التاجر
  'admin:notification': any; // للأدمن/الوكلاء
  admin_new_message: { sessionId: string; message: KleemWsMessage };
}

/** ما يرسله العميل للسيرفر */
export interface ClientToServerEvents {
  user_message: UserMessagePayload;
  typing: TypingPayload;
  join?: { sessionId?: string; merchantId?: string; rooms?: string[] };
  leave?: { sessionId?: string; merchantId?: string; rooms?: string[] };
  'admin:subscribe'?: void;
}

export interface SocketData {
  sessionId?: string;
  role?: KleemAdminRole;
}
