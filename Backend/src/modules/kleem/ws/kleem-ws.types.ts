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
  role: KleemRole; // غالباً 'user'
}

/** ما يرسله السيرفر للعميل */
export interface ServerToClientEvents {
  bot_reply: KleemWsMessage; // ردّ البوت
  message: KleemWsMessage; // استخدام عام
  typing: TypingPayload; // مؤشر "يكتب..."
  admin_new_message: { sessionId: string; message: KleemWsMessage }; // بث للمشرفين
}

/** ما يرسله العميل للسيرفر */
export interface ClientToServerEvents {
  user_message: UserMessagePayload;
  typing: TypingPayload;
  join?: { sessionId: string; role?: KleemAdminRole; token?: string };
}

export interface SocketData {
  sessionId?: string;
  role?: KleemAdminRole;
}
