// src/features/chat/socket/types.ts
import type { ChatMessage } from "@/features/mechant/Conversations/type";
export type WsEvent =
  | { type: "message:new"; payload: ChatMessage }
  | { type: "session:update"; payload: { sessionId: string } };
