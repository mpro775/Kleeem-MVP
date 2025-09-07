// useChatWebSocket.ts (للوحة التحكم)
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage } from "@/features/mechant/Conversations/type";

export function useChatWebSocket(
  sessionId: string | undefined,
  onMessage: (m: ChatMessage) => void,
  merchantId?: string
) {
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef(onMessage);

  useEffect(() => { handlerRef.current = onMessage; }, [onMessage]);

  useEffect(() => {
    if (!sessionId) return;
    const origin = import.meta.env.VITE_WS_ORIGIN ?? "https://api.kaleem-ai.com";

    const socket = io(origin, {
      path: "/api/chat",
      transports: ["websocket"],
      withCredentials: true,
      query: { sessionId, role: "agent", merchantId },
    });

    const onMsg = (m: ChatMessage) => handlerRef.current?.(m);

    socket.on("connect", () => console.log("socket.io: Connected!", socket.id));
    socket.on("disconnect", () => console.log("socket.io: Disconnected!"));
    socket.on("connect_error", (e) => console.warn("socket.io: connect_error", e?.message));
    socket.on("message", onMsg);

    socketRef.current = socket;
    return () => {
      socket.off("message", onMsg);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, merchantId]);
}
