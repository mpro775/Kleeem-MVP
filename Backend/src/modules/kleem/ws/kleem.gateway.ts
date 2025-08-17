// src/modules/kleem/ws/kleem.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { KleemChatService } from '../chat/kleem-chat.service';
import {
  KleemWsMessage,
  TypingPayload,
  UserMessagePayload,
} from './kleem-ws.types';

@WebSocketGateway({
  path: '/api/kleem/ws',
  cors: { origin: ['http://localhost:5173'], credentials: true },
  transports: ['websocket'],
})
@Injectable()
export class KleemGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(KleemGateway.name);
  @WebSocketServer() server: Server;

  constructor(private readonly kleem: KleemChatService) {}

  handleConnection(client: Socket) {
    const { sessionId, role } = client.handshake.query as Record<
      string,
      string
    >;
    if (sessionId) client.join(sessionId);
    if (role === 'admin' || role === 'agent') client.join('kleem_admin');
  }
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected ${client.id}`);
  }

  // استماع للأحداث القادمة من الخدمة وبثّها
  @OnEvent('kleem.bot_reply')
  onBotReply(payload: { sessionId: string; message: KleemWsMessage }) {
    this.server.to(payload.sessionId).emit('bot_reply', payload.message);
  }

  @OnEvent('kleem.admin_new_message')
  onAdminFeed(payload: { sessionId: string; message: KleemWsMessage }) {
    this.server.to('kleem_admin').emit('admin_new_message', payload);
  }

  // استقبال رسالة مستخدم عبر WS وتمريرها للخدمة
  @SubscribeMessage('user_message')
  async onUserMessage(
    @MessageBody() body: UserMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      client.emit('typing', { sessionId: body.sessionId, role: 'user' });

      const { sessionId, text, metadata } = body;
      if (!sessionId || !text) return;
      await this.kleem.handleUserMessage(sessionId, text, metadata);
      return { ok: true };
    } catch (e) {
      this.logger.error('onUserMessage error', e as Error);
      return { ok: false };
    }
  }

  @SubscribeMessage('typing')
  onTyping(@MessageBody() payload: TypingPayload) {
    if (!payload.sessionId) return;
    this.server.to(payload.sessionId).emit('typing', payload);
  }
}
