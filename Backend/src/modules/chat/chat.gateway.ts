// src/features/chat/chat.gateway.ts (أو حيث تضعه)
import { OnModuleInit } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@WebSocketGateway({
  path: '/api/chat',
  cors: {
    origin: ['http://localhost:5173','https://app.kaleem-ai.com','https://kaleem-ai.com'],
    credentials: true,
  },
  transports: ['websocket','polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer() server: Server;

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://redis:6379'; // اسم خدمة redis في docker-compose
    const pub = createClient({ url });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.server.adapter(createAdapter(pub, sub));
    // console.log('[WS] Redis adapter ready');
  }
  handleConnection(client: Socket) {
    const q = client.handshake.query as Record<string, string | undefined>;
    const sessionId = q.sessionId;
    const role = (q.role || '').toLowerCase();
    const merchantId = q.merchantId;

    // أي مستخدم مع sessionId ينضم للغرفة
    if (sessionId) client.join(sessionId);

    // إن توفر merchantId نضمه لغرفة التاجر
    if (merchantId) client.join(`merchant:${merchantId}`);

    // للمشرفين/الوكلاء قناة بث عامة (للخلفية القديمة)
    if (role === 'admin' || role === 'agent') {
      client.join('admin');
      // يمكن أيضًا إنشاء قناة أحدث:
      client.join('agents');
      // console.log('Agent/Admin connected:', client.id);
    }
  }

  handleDisconnect(client: Socket) {
    // console.log('Client disconnected', client.id);
  }

  // انضمام/مغادرة ديناميكي (اختياري)
  @SubscribeMessage('join')
  onJoin(
    @MessageBody()
    body: { sessionId?: string; merchantId?: string; rooms?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    if (body?.sessionId) client.join(body.sessionId);
    if (body?.merchantId) client.join(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => client.join(r));
    return { ok: true };
  }

  @SubscribeMessage('leave')
  onLeave(
    @MessageBody()
    body: { sessionId?: string; merchantId?: string; rooms?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    if (body?.sessionId) client.leave(body.sessionId);
    if (body?.merchantId) client.leave(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => client.leave(r));
    return { ok: true };
  }

  // typing على مستوى الجلسة
  @SubscribeMessage('typing')
  onTyping(
    @MessageBody() payload: { sessionId?: string; role?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!payload?.sessionId) return;
    this.server.to(payload.sessionId).emit('typing', {
      sessionId: payload.sessionId,
      role: (payload.role || 'user') as 'user' | 'agent',
    });
  }

  // استدعِ هذه من الخدمة عند حفظ رسالة جديدة
  sendMessageToSession(
    sessionId: string,
    message: any & { merchantId?: string },
  ) {
    // للعميلين في نفس الجلسة
    this.server.to(sessionId).emit('message', message);

    // بث للمشرفين (توافقية قديمة)
    this.server.to('admin').emit('admin_new_message', { sessionId, message });

    // (اختياري) بث لكل مستخدمي لوحة نفس التاجر
    if (message?.merchantId) {
      this.server
        .to(`merchant:${message.merchantId}`)
        .emit('message', { sessionId, ...message });
    }
  }
}
