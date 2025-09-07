// src/features/landing/chatKaleem/chatService.ts
import { io, Socket } from "socket.io-client";
import { fetchKleemSession } from "@/features/kaleem/api";
import { getKleemSessionId } from "@/features/kaleem/helper";
import type { ChatMessage } from "./types";

class ChatService {
  private socket: Socket | null = null;
  private onMessageCallback: ((msg: ChatMessage) => void) | null = null;
  private onTypingCallback: ((isTyping: boolean) => void) | null = null;

  connect() {
    if (this.socket) return; // منع الاتصال المتعدد

    const origin =
      import.meta.env.VITE_WS_ORIGIN ?? "https://api.kaleem-ai.com";
    const path = import.meta.env.VITE_WS_PATH ?? "/api/kaleem/ws";
    const sessionId = getKleemSessionId();

    this.socket = io(origin, {
      path,
      transports: ["websocket"],
      query: { sessionId, role: "guest" },
    });

    this.socket.on("connect", () => {
      console.log("Socket connected!");
      this.fetchInitialMessages();
    });

    this.socket.on("bot_reply", (msg: any) => {
      this.onTypingCallback?.(false);
      const newMessage: ChatMessage = {
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        from: "bot",
        text: msg?.text ?? "",
        rateIdx: msg?.msgIdx,
      };
      this.onMessageCallback?.(newMessage);
    });

    this.socket.on("typing", (p: { role: "bot" | "user" }) => {
      if (p.role === "bot") {
        this.onTypingCallback?.(true);
      }
    });

    // يمكنك إضافة معالجة للأخطاء هنا
  }

  async fetchInitialMessages() {
    try {
      const session = await fetchKleemSession();
      // منطق تحويل الرسائل يمكن أن يبقى هنا أو في الخطاف
    } catch (e) {
      console.error("Failed to fetch initial session", e);
    }
  }

  sendMessage(text: string) {
    // يمكن إرسال الرسالة عبر السوكيت هنا إذا كان الـ API يدعم ذلك
    // حاليًا الكود يستخدم HTTP POST، وهذا جيد
  }

  onMessage(callback: (msg: ChatMessage) => void) {
    this.onMessageCallback = callback;
  }

  onTyping(callback: (isTyping: boolean) => void) {
    this.onTypingCallback = callback;
  }

  disconnect() {
    this.socket?.close();
    this.socket = null;
  }
}

// تصدير نسخة واحدة من الخدمة (Singleton Pattern)
export const chatService = new ChatService();
