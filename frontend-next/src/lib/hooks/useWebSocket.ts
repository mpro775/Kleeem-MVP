'use client';

import { useEffect, useMemo } from 'react';
import { connectSocket, disconnectSocket, getSocket, type SocketMessage } from '@/lib/websocket';

export function useWebSocket() {
  // Use useMemo to get socket instance once and avoid accessing ref during render
  const socket = useMemo(() => getSocket(), []);

  useEffect(() => {
    connectSocket();

    return () => {
      disconnectSocket();
    };
  }, []);

  return socket;
}

export function useConversationSocket(
  conversationId: string,
  onMessage: (message: SocketMessage) => void
) {
  const socket = useWebSocket();

  useEffect(() => {
    if (!conversationId) return;

    socket.emit('join_conversation', conversationId);
    socket.on('new_message', onMessage);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', onMessage);
    };
  }, [conversationId, onMessage, socket]);

  return socket;
}

