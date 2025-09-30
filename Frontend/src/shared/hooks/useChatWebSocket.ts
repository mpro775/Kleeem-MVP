import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";
import { createChatSocket, type ChatRole } from "@/shared/lib/ws";
import type { ChatMessage } from "@/features/mechant/Conversations/type";

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

    return () => {
      socket.off("message", onMsg);
      socket.off("bot_reply", onMsg);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, role, merchantId]);
}
