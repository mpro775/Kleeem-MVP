
export type KleemRole = "user" | "bot";

export interface KleemMessage {
  role: KleemRole;
  text: string;
  rating?: 0 | 1 | null;
  feedback?: string | null;
  metadata?: Record<string, unknown>;
  timestamp?: string; // اختياري إن أرجعته الـAPI
}

export interface KleemSource {
  id: string | number; // Qdrant id قد يكون string/number
  question?: string;
  answer?: string;
  score?: number;
}

export interface KleemSendRequest {
  text: string;
  metadata?: Record<string, unknown>;
}

export type KleemSendResponse =
  | { status: "queued" }
  | { reply: string; msgIdx: number; sources?: KleemSource[] };

export interface KleemRateRequest {
  msgIdx: number;
  rating: 0 | 1;
  feedback?: string;
}

export interface KleemRateResponse {
  status: "ok";
}

export interface KleemSessionResponse {
  sessionId: string;
  messages: KleemMessage[];
}
