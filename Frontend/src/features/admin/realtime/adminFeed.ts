// src/realtime/adminFeed.ts
import { io, Socket } from "socket.io-client";
import { isMockDataEnabled } from "@/mock-data";

export function connectAdminFeed(token?: string) {
  // تعطيل WebSocket في وضع الديمو
  if (isMockDataEnabled()) {
    const MockSocket = {
      on: () => MockSocket,
      off: () => MockSocket,
      emit: () => MockSocket,
      disconnect: () => {},
      connect: () => {},
      connected: false,
      id: undefined,
    } as unknown as Socket;
    
    console.log("[DEMO MODE] Admin feed WebSocket disabled");
    return MockSocket;
  }

  const socket: Socket = io("https://api.kaleem-ai.com", {
    path: "/api/kleem/ws",
    transports: ["websocket", "polling"], // اسمح بالـ polling كباك أب
    auth: token ? { token } : undefined,
    withCredentials: true,
  });
  return socket;
}
