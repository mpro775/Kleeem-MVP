'use client';

import { io, Socket } from 'socket.io-client';

// Define message type for WebSocket messages
export interface SocketMessage {
  id?: string;
  content?: string;
  conversationId?: string;
  timestamp?: string;
  [key: string]: unknown;
}

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
    socket = io(url, {
      autoConnect: false,
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection Error:', error);
    });
  }

  return socket;
}

export function connectSocket(): void {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function subscribeToConversation(
  conversationId: string,
  callback: (message: SocketMessage) => void
): void {
  const socket = getSocket();
  socket.emit('join_conversation', conversationId);
  socket.on('new_message', callback);
}

export function unsubscribeFromConversation(conversationId: string): void {
  const socket = getSocket();
  socket.emit('leave_conversation', conversationId);
  socket.off('new_message');
}

export function sendMessage(conversationId: string, message: string): void {
  const socket = getSocket();
  socket.emit('send_message', { conversationId, message });
}

