// shared/hooks/useAdminNotifications.ts
import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type { AdminNotification, ChatNotification, SystemNotification } from "@/shared/types/notification";
import { useAuth } from "@/context/hooks";

type OnNewMessage = (payload: AdminNotification) => void;

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const asStr = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;

const asNum = (v: unknown): number | undefined =>
  typeof v === "number" ? v : undefined;

const isChatChannel = (v: unknown): v is ChatNotification["channel"] =>
  v === "webchat" || v === "whatsapp" || v === "telegram";

// تطبيع الحدث الوارد من الباك اند إلى AdminNotification
function normalize(raw: unknown): AdminNotification | null {
  if (!isObj(raw)) return null;

  // Chat
  const msg = isObj(raw.message) ? raw.message : undefined;
  const text = asStr(msg?.text);
  const sessionId = asStr(raw.sessionId);
  if (text && sessionId) {
    const ch = isChatChannel(raw.channel) ? raw.channel : "webchat";
    const ts = asNum(raw.ts) ?? Date.now();
    const chat: ChatNotification = {
      kind: "chat",
      sessionId,
      message: { text },
      channel: ch,
      ts,
    };
    return chat;
  }

  // System
  const id = asStr(raw.id) ?? (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  const type = asStr(raw.type) ?? "general";
  const title = asStr(raw.title) ?? "إشعار";
  const body = asStr(raw.body) ?? "";
  const severityRaw = asStr(raw.severity);
  const severity: SystemNotification["severity"] =
    severityRaw === "success" || severityRaw === "warning" || severityRaw === "error" ? severityRaw : "info";
  const ts = asNum(raw.ts) ?? Date.now();

  const system: SystemNotification = {
    kind: "system",
    id,
    type,
    title,
    body,
    // data قد تكون كائنًا أو undefined
    data: isObj(raw.data) ? (raw.data as Record<string, unknown>) : undefined,
    severity,
    userId: asStr(raw.userId),
    merchantId: asStr(raw.merchantId),
    ts,
  };
  return system;
}

export function useAdminNotifications(onNewMessage: OnNewMessage) {
  const { token, user } = useAuth(); // تأكد أن التوكن و merchantId متوفرين
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

    // حدث موحّد من الباك اند
    const onAny = (payload: unknown) => {
      try {
        const normalized = normalize(payload);
        if (normalized) handlerRef.current(normalized);
      } catch (e) {
        console.error("Failed to normalize notification:", e);
      }
    };

    socket.on("admin:notification", onAny);
    // توافقية مع الحدث القديم
    socket.on("admin_new_message", onAny);

    socket.on("connect_error", (e) =>
      console.warn("ws connect_error:", e.message)
    );
    socket.on("error", (e) =>
      console.warn("ws error:", e)
    );

    return () => {
      socket.off("admin:notification", onAny);
      socket.off("admin_new_message", onAny);
      socket.disconnect();
    };
  }, [token, user?.merchantId, user?.id]);
}
