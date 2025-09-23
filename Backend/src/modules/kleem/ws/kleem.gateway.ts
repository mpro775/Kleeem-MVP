// src/modules/kleem/ws/kleem.gateway.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
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
import { createAdapter } from '@socket.io/redis-adapter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Gauge } from 'prom-client';
import { createClient } from 'redis';
import { Server, Socket } from 'socket.io';

import { KleemChatService } from '../chat/kleem-chat.service';

import {
  UserMessagePayload,
  TypingPayload,
  KleemWsMessage,
} from './kleem-ws.types';
type JwtPayloadSafe = {
  userId?: string;
  merchantId?: string;
  role?: string;
};

function isJwtPayloadSafe(v: unknown): v is JwtPayloadSafe {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  const okUser = o.userId === undefined || typeof o.userId === 'string';
  const okMerchant =
    o.merchantId === undefined || typeof o.merchantId === 'string';
  const okRole = o.role === undefined || typeof o.role === 'string';
  return okUser && okMerchant && okRole;
}

function hasNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

const ROLE_ADMIN = 'ADMIN' as const;
const ROLE_AGENT = 'AGENT' as const;
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
    @InjectMetric('websocket_active_connections')
    private readonly wsGauge: Gauge<string>,
  ) {}

  private verifyJwtToken(token: string | undefined): {
    userId?: string;
    merchantId?: string;
    roleIsAdminOrAgent: boolean;
  } {
    let userId: string | undefined;
    let merchantId: string | undefined;
    let roleIsAdminOrAgent = false;

    try {
      if (token) {
        const decoded: unknown = this.jwt.verify(token); // لا نثق بالأنواع الراجعة
        if (isJwtPayloadSafe(decoded)) {
          if (hasNonEmptyString(decoded.userId)) {
            userId = decoded.userId;
          }
          if (hasNonEmptyString(decoded.merchantId)) {
            merchantId = decoded.merchantId;
          }
          const roleUpper = hasNonEmptyString(decoded.role)
            ? decoded.role.toUpperCase()
            : undefined;

          roleIsAdminOrAgent =
            roleUpper === ROLE_ADMIN || roleUpper === ROLE_AGENT;
        }
        // لو payload غير متوافق، نُبقي القيم على حالها (ضيف بدون صلاحيات)
      }
    } catch {
      // ضيف بدون صلاحيات
    }

    return { userId, merchantId, roleIsAdminOrAgent };
  }

  private joinRooms(
    client: Socket,
    userId?: string,
    merchantId?: string,
    sessionId?: string,
    roleIsAdminOrAgent?: boolean,
  ): void {
    // غرف الهوية
    if (userId) void client.join(`user:${userId}`);
    if (merchantId) void client.join(`merchant:${merchantId}`);

    // غرفة الجلسة (للزائر/الليندنج)
    if (sessionId) void client.join(sessionId);

    // الأدمن/الوكيل من JWT فقط
    if (roleIsAdminOrAgent) void client.join('kleem_admin');
  }

  // ✅ Redis adapter (مثل ChatGateway السابق)
  async afterInit(): Promise<void> {
    const url = process.env.REDIS_URL || 'redis://redis:6379';
    const pub = createClient({ url });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.server.adapter(createAdapter(pub, sub));
  }

  handleConnection(client: Socket): void {
    const auth = client.handshake.auth as Record<string, unknown>;
    const token = auth?.token as string | undefined;

    const { userId, merchantId, roleIsAdminOrAgent } =
      this.verifyJwtToken(token);

    const q = client.handshake.query as Record<string, unknown>;
    const sessionId = (q?.sessionId as string) || undefined;

    this.joinRooms(client, userId, merchantId, sessionId, roleIsAdminOrAgent);

    // تتبع الاتصالات النشطة
    this.wsGauge.inc({ namespace: 'kleem' });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleDisconnect(client: Socket): void {
    // cleanup تلقائي من socket.io

    // تتبع الاتصالات النشطة
    this.wsGauge.dec({ namespace: 'kleem' });
  }

  // (اختياري) اشتراك صريح للأدمن
  @SubscribeMessage('admin:subscribe')
  onAdminSubscribe(@ConnectedSocket() client: Socket): void {
    void client.join('kleem_admin');
    client.emit('admin:notification', { type: 'joined', title: 'مرحباً بك' });
  }

  // -------- Bridging Events → Socket --------
  @OnEvent('kleem.bot_reply') onBotReply(p: {
    sessionId: string;
    message: KleemWsMessage;
  }): void {
    this.server.to(p.sessionId).emit('bot_reply', p.message);
  }

  @OnEvent('kleem.admin_new_message')
  onAdminFeed(p: { sessionId: string; message: KleemWsMessage }): void {
    this.server.to('kleem_admin').emit('admin_new_message', p);
  }

  @OnEvent('admin:notification')
  onAdminNotification(payload: unknown): void {
    this.server.to('kleem_admin').emit('admin:notification', payload);
  }

  @OnEvent('notify.user')
  onNotifyUser(payload: { userId: string }): void {
    this.server.to(`user:${payload.userId}`).emit('notification', payload);
  }

  @OnEvent('notify.merchant')
  onNotifyMerchant(payload: { merchantId: string }): void {
    this.server
      .to(`merchant:${payload.merchantId}`)
      .emit('notification', payload);
  }

  @OnEvent('kleem.typing') onBotTyping(p: {
    sessionId: string;
    role: 'bot';
  }): void {
    this.server.to(p.sessionId).emit('typing', p);
  }

  @OnEvent('kleem.bot_chunk') onBotChunk(p: {
    sessionId: string;
    delta: string;
  }): void {
    this.server.to(p.sessionId).emit('bot_chunk', p);
  }
  @OnEvent('kleem.bot_done') onBotDone(p: { sessionId: string }): void {
    this.server.to(p.sessionId).emit('bot_done', p);
  }

  // -------- استقبال رسائل العميل --------
  @SubscribeMessage('user_message')
  async onUserMessage(
    @MessageBody() body: UserMessagePayload,
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    try {
      const { sessionId, text, metadata } = body || {};
      if (!sessionId || !text) return { ok: false };
      client.emit('typing', { sessionId, role: 'user' });
      await this.kleem.handleUserMessage(sessionId, text, metadata);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @SubscribeMessage('typing')
  onTyping(@MessageBody() payload: TypingPayload): void {
    if (!payload?.sessionId) return;
    this.server.to(payload.sessionId).emit('typing', payload);
  }

  // (اختياري) انضمام ديناميكي موحّد
  @SubscribeMessage('join')
  onJoin(
    @MessageBody()
    body: { sessionId?: string; merchantId?: string; rooms?: string[] },
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    if (body?.sessionId) void client.join(body.sessionId);
    if (body?.merchantId) void client.join(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => void client.join(r));
    return Promise.resolve({ ok: true });
  }

  @SubscribeMessage('leave')
  onLeave(
    @MessageBody()
    body: { sessionId?: string; merchantId?: string; rooms?: string[] },
    @ConnectedSocket() client: Socket,
  ): Promise<{ ok: boolean }> {
    if (body?.sessionId) void client.leave(body.sessionId);
    if (body?.merchantId) void client.leave(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => void client.leave(r));
    return Promise.resolve({ ok: true });
  }
}
