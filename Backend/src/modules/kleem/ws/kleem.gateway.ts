// src/modules/kleem/ws/kleem.gateway.ts
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import {
  UserMessagePayload,
  TypingPayload,
  KleemWsMessage,
} from './kleem-ws.types';
import { OnEvent } from '@nestjs/event-emitter';
import { KleemChatService } from '../chat/kleem-chat.service';

@WebSocketGateway({
  path: '/api/kaleem/ws', // ✅ موحّد
  cors: {
    origin: [
      'http://localhost:5173',
      'https://app.kaleem-ai.com',
      'https://kaleem-ai.com',
    ],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@Injectable()
export class KleemGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer() server: Server;

  constructor(
    private readonly kleem: KleemChatService,
    private readonly jwt: JwtService,
  ) {}

  // ✅ Redis adapter (مثل ChatGateway السابق)
  async afterInit() {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    const pub = createClient({ url });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.server.adapter(createAdapter(pub, sub));
  }

  handleConnection(client: Socket) {
    const auth = client.handshake.auth as any;
    const token = auth?.token as string | undefined;

    let userId: string | undefined;
    let merchantId: string | undefined;
    let roleIsAdminOrAgent = false;

    try {
      if (token) {
        const payload: any = this.jwt.verify(token);
        userId = payload?.userId || payload?.sub || payload?._id;
        merchantId = payload?.merchantId;
        const role = (payload?.role || '').toString().toUpperCase();
        roleIsAdminOrAgent = role === 'ADMIN' || role === 'AGENT'; // ✅ لا تعتمد على query نهائياً
      }
    } catch {
      // ضيف بدون صلاحيات
    }

    // غرف الهوية
    if (userId) void client.join(`user:${userId}`);
    if (merchantId) void client.join(`merchant:${merchantId}`);

    // غرفة الجلسة (للزائر/الليندنج)
    const q = client.handshake.query as any;
    const sessionId = (q?.sessionId as string) || undefined;
    if (sessionId) void client.join(sessionId);

    // الأدمن/الوكيل من JWT فقط
    if (roleIsAdminOrAgent) void client.join('kleem_admin'); // ✅ موحّد
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleDisconnect(_: Socket) {
    // cleanup تلقائي من socket.io
  }

  // (اختياري) اشتراك صريح للأدمن
  @SubscribeMessage('admin:subscribe')
  onAdminSubscribe(@ConnectedSocket() client: Socket) {
    void client.join('kleem_admin');
    client.emit('admin:notification', { type: 'joined', title: 'مرحباً بك' });
  }

  // -------- Bridging Events → Socket --------
  @OnEvent('kleem.bot_reply') onBotReply(p: {
    sessionId: string;
    message: KleemWsMessage;
  }) {
    this.server.to(p.sessionId).emit('bot_reply', p.message);
  }

  @OnEvent('kleem.admin_new_message')
  onAdminFeed(p: { sessionId: string; message: KleemWsMessage }) {
    this.server.to('kleem_admin').emit('admin_new_message', p);
  }

  @OnEvent('admin:notification')
  onAdminNotification(payload: any) {
    this.server.to('kleem_admin').emit('admin:notification', payload);
  }

  @OnEvent('notify.user')
  onNotifyUser(payload: any & { userId: string }) {
    this.server.to(`user:${payload.userId}`).emit('notification', payload);
  }

  @OnEvent('notify.merchant')
  onNotifyMerchant(payload: any & { merchantId: string }) {
    this.server
      .to(`merchant:${payload.merchantId}`)
      .emit('notification', payload);
  }

  @OnEvent('kleem.typing') onBotTyping(p: { sessionId: string; role: 'bot' }) {
    this.server.to(p.sessionId).emit('typing', p);
  }

  @OnEvent('kleem.bot_chunk') onBotChunk(p: {
    sessionId: string;
    delta: string;
  }) {
    this.server.to(p.sessionId).emit('bot_chunk', p);
  }
  @OnEvent('kleem.bot_done') onBotDone(p: { sessionId: string }) {
    this.server.to(p.sessionId).emit('bot_done', p);
  }

  // -------- استقبال رسائل العميل --------
  @SubscribeMessage('user_message')
  async onUserMessage(
    @MessageBody() body: UserMessagePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { sessionId, text, metadata } = body || {};
      if (!sessionId || !text) return;
      client.emit('typing', { sessionId, role: 'user' });
      await this.kleem.handleUserMessage(sessionId, text, metadata);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('typing')
  onTyping(@MessageBody() payload: TypingPayload) {
    if (!payload?.sessionId) return;
    this.server.to(payload.sessionId).emit('typing', payload);
  }

  // (اختياري) انضمام ديناميكي موحّد
  @SubscribeMessage('join')
  onJoin(
    @MessageBody()
    body: { sessionId?: string; merchantId?: string; rooms?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    if (body?.sessionId) void client.join(body.sessionId);
    if (body?.merchantId) void client.join(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => void client.join(r));
    return { ok: true };
  }

  @SubscribeMessage('leave')
  onLeave(
    @MessageBody()
    body: { sessionId?: string; merchantId?: string; rooms?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    if (body?.sessionId) void client.leave(body.sessionId);
    if (body?.merchantId) void client.leave(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => void client.leave(r));
    return { ok: true };
  }
}
