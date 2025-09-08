import { io, Socket } from "socket.io-client";
import { API_BASE } from "@/context/config";

export type ChatRole = "customer" | "agent" | "guest";

type CreateChatSocketOpts = {
  sessionId: string;
  role: ChatRole;
  merchantId?: string;
  origin?: string; // اختياري override
  path?: string; // اختياري override
  token?: string; // اختياري override (وإلا نأخذ من localStorage)
};

export function createChatSocket(opts: CreateChatSocketOpts): Socket {
  const defaultOrigin =
    (API_BASE || "").replace(/\/api\/?$/, "") || "https://api.kaleem-ai.com";
  const origin = opts.origin || import.meta.env.VITE_WS_ORIGIN || defaultOrigin;
  const path = opts.path || import.meta.env.VITE_WS_PATH || "/api/chat";
  const token = opts.token ?? localStorage.getItem("token") ?? undefined;

  return io(origin, {
    path,
    transports: ["websocket"],
    withCredentials: false,
    auth: token ? { token } : undefined,
    query: {
      sessionId: opts.sessionId,
      role: opts.role,
      merchantId: opts.merchantId,
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelayMax: 5000,
  });
}
