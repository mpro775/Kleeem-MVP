// useChatSocket.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { ChatMessage } from "@/features/mechant/Conversations/type";

type OnMessageHandler = (msg: ChatMessage) => void;

export function useChatSocket(
  sessionId: string | undefined,
  onMessage: OnMessageHandler,
  role: "customer" | "agent", // ✅ مرّر الدور
  merchantId?: string
) {
  const socketRef = useRef<Socket | null>(null);
  const handlerRef = useRef(onMessage);

  useEffect(() => {
    handlerRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!sessionId) return;

    const socket: Socket = io("https://api.kaleem-ai.com", {
      path: "/api/chat", // ✅ نفس الـ path للجميع
      transports: ["websocket"],
      withCredentials: true,
      query: { sessionId, role, merchantId }, // ✅ مرّر الدور الصحيح
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });

    const onMsg = (m: ChatMessage) => handlerRef.current?.(m);

    socket.on("connect", () => console.log("socket.io: Connected!", socket.id));
    socket.on("disconnect", () => console.log("socket.io: Disconnected!"));
    socket.on("connect_error", (e) =>
      console.warn("socket.io: connect_error", e?.message)
    );
    socket.on("message", onMsg); // ✅ اسم الحدث الموحّد

    socketRef.current = socket;
    return () => {
      socket.off("message", onMsg);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, role, merchantId]);
}
