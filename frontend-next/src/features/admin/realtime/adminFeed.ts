// src/realtime/adminFeed.ts
import { io, Socket } from "socket.io-client";

export function connectAdminFeed(token?: string) {
  const socket: Socket = io("https://api.kaleem-ai.com", {
    path: "/api/kleem/ws",
    transports: ["websocket", "polling"], // اسمح بالـ polling كباك أب
    auth: token ? { token } : undefined,
    withCredentials: true,
  });
  return socket;
}
