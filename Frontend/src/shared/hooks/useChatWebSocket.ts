import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createChatSocket, type ChatRole } from "@/shared/lib/ws";
import type { ChatMessage } from "@/features/mechant/Conversations/type";
import { isMockDataEnabled } from "@/mock-data";

type OnMessageHandler = (msg: ChatMessage) => void;

export function useChatSocket(
  sessionId: string | undefined,
  onMessage: OnMessageHandler,
  role: ChatRole,
  merchantId?: string
) {
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!sessionId) return;

    const socket = createChatSocket({ sessionId, role, merchantId });

    // سنوحّد الاستقبال على حدث "message"
    const onMsg = (m: ChatMessage) => handlerRef.current?.(m);

    socket.on("connect", () =>
      console.log("socket.io: Connected!", (socket as { id?: string }).id)
    );
    socket.on("disconnect", () => console.log("socket.io: Disconnected!"));
    socket.on("connect_error", (e) =>
      console.warn("socket.io: connect_error", e?.message)
    );

    // 🔗 دعم كلا الاسمين إن كان الباك يُرسل حدثين مختلفين
    socket.on("message", onMsg);
    socket.on("bot_reply", onMsg);

    socketRef.current = socket;

    // محاكاة WebSocket في وضع الديمو: الاستماع لأحداث مخصصة
    if (isMockDataEnabled() && typeof window !== "undefined") {
      const handleDemoMessage = (event: CustomEvent) => {
        if (event.detail?.sessionId === sessionId) {
          const msg = event.detail.message as ChatMessage;
          console.log("[DEMO MODE] Received message via custom event:", msg);
          handlerRef.current?.(msg);
        }
      };

      window.addEventListener("demo-message-received", handleDemoMessage as EventListener);

      // Polling للتحقق من الرسائل الجديدة كل ثانيتين
      const pollInterval = setInterval(async () => {
        try {
          // جلب الرسائل من API
          const response = await fetch(`/api/messages/public/demo/webchat/${sessionId}`);
          if (response.ok) {
            const data = await response.json();
            const messages = data?.data?.messages || [];
            if (messages.length > 0) {
              const lastMessage = messages[messages.length - 1];
              // التحقق من أن الرسالة جديدة
              const existingMessages = Array.from(document.querySelectorAll("[data-message-id]"));
              const messageExists = existingMessages.some(
                (el) => el.getAttribute("data-message-id") === lastMessage._id
              );
              if (!messageExists && lastMessage.role === "agent") {
                handlerRef.current?.(lastMessage);
              }
            }
          }
        } catch (error) {
          // تجاهل الأخطاء في polling
        }
      }, 2000);

      return () => {
        socket.off("message", onMsg);
        socket.off("bot_reply", onMsg);
        socket.disconnect();
        socketRef.current = null;
        window.removeEventListener("demo-message-received", handleDemoMessage as EventListener);
        clearInterval(pollInterval);
      };
    }

    return () => {
      socket.off("message", onMsg);
      socket.off("bot_reply", onMsg);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, role, merchantId]);
}
