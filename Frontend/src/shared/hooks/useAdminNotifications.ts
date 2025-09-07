// shared/hooks/useAdminNotifications.ts
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type { AdminNotification } from "@/shared/types/notification";
import { useAuth } from "@/context/AuthContext";

type OnNewMessage = (payload: AdminNotification) => void;

export function useAdminNotifications(onNewMessage: OnNewMessage) {
  const { token, user } = useAuth(); // تأكد إن التوكن و merchantId متوفرين
  const handlerRef = useRef(onNewMessage);
  handlerRef.current = onNewMessage;

  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(import.meta.env.VITE_WS_ORIGIN!, {
      path: import.meta.env.VITE_WS_PATH || "/api/kaleem/ws",
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelayMax: 5000,
    });

    // اشترك في قناة التاجر/المستخدم بعد الاتصال
    socket.on("connect", () => {
      socket.emit("admin:subscribe", {
        merchantId: user?.merchantId,
        userId: user?.id,
        version: "v1",
      });
    });

    // توحيد الحمولة: نحولها إلى AdminNotification (chat | system)
    const normalize = (raw: any): AdminNotification => {
      if (raw?.message?.text && raw?.sessionId) {
        // إشعار محادثة
        return {
          kind: "chat",
          sessionId: raw.sessionId,
          message: { text: raw.message.text },
          channel: raw.channel ?? "webchat",
          ts: raw.ts ?? Date.now(),
        };
      }
      // إشعار نظام
      return {
        kind: "system",
        id: raw.id ?? crypto.randomUUID(),
        type: raw.type ?? "general",
        title: raw.title ?? "إشعار",
        body: raw.body ?? "",
        severity: raw.severity ?? "info",
        data: raw.data,
        ts: raw.ts ?? Date.now(),
      };
    };

    const onAny = (payload: any) => {
      try {
        handlerRef.current(normalize(payload));
      } catch (e) {
        // تجاهل
      }
    };

    // الحدث الجديد الموحّد
    socket.on("admin:notification", onAny);
    // دعم الحدث القديم لتوافقية خلفية
    socket.on("admin_new_message", onAny);

    socket.on("connect_error", (e) =>
      console.warn("ws connect_error:", e.message)
    );
    socket.on("error", (e) => console.warn("ws error:", e));

    return () => {
      socket.off("admin:notification", onAny);
      socket.off("admin_new_message", onAny);
      socket.disconnect();
    };
  }, [token, user?.merchantId, user?.id]);
}
