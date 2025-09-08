// src/features/chat/chat.gateway.ts (أو حيث تضعه)
import { OnModuleInit, Inject, Logger } from '@nestjs/common';
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
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

@WebSocketGateway({
  path: '/api/chat',
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
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // ✅ D2: تتبع معدل الرسائل لكل socket
  private readonly messageRates = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly RATE_LIMIT_WINDOW = 10 * 1000; // 10 ثوان
  private readonly RATE_LIMIT_MAX = 10; // 10 رسائل كحد أقصى

  constructor(
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    const url = process.env.REDIS_URL || 'redis://redis:6379'; // اسم خدمة redis في docker-compose
    const pub = createClient({ url });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.server.adapter(createAdapter(pub, sub));
    // console.log('[WS] Redis adapter ready');
  }
  async handleConnection(client: Socket) {
    try {
      // ✅ C3: التحقق من JWT في WebSocket
      const isAuthenticated = await this.authenticateWsClient(client);
      if (!isAuthenticated) {
        this.logger.warn(
          `Unauthorized WebSocket connection attempt: ${client.id}`,
        );
        client.emit('error', { message: 'Unauthorized' });
        client.disconnect(true);
        return;
      }

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

      this.logger.debug(
        `WebSocket client connected: ${client.id} (session: ${sessionId})`,
      );
    } catch (error) {
      this.logger.error(`WebSocket connection error: ${error.message}`);
      client.emit('error', { message: 'Connection failed' });
      client.disconnect(true);
    }
  }

  /**
   * ✅ C3: التحقق من JWT للـ WebSocket
   */
  private async authenticateWsClient(client: Socket): Promise<boolean> {
    try {
      // استخراج التوكن من handshake
      const token = this.extractWsToken(client);
      if (!token) {
        return false;
      }

      // التحقق من صحة التوكن
      const decoded = this.jwtService.verify(token) as any;
      if (!decoded?.jti) {
        return false;
      }

      // التحقق من القائمة السوداء
      const blacklistKey = `bl:${decoded.jti}`;
      const isBlacklisted = await this.cacheManager.get(blacklistKey);

      if (isBlacklisted) {
        return false;
      }

      // حفظ معلومات المستخدم في client
      client.data.user = {
        userId: decoded.userId,
        role: decoded.role,
        merchantId: decoded.merchantId,
      };

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * استخراج التوكن من WebSocket handshake
   */
  private extractWsToken(client: Socket): string | null {
    // الطريقة 1: من auth header في handshake
    const authHeader = client.handshake.auth?.token;
    if (authHeader) {
      return authHeader;
    }

    // الطريقة 2: من query parameter
    const queryToken = client.handshake.query?.token as string;
    if (queryToken) {
      return queryToken;
    }

    // الطريقة 3: من headers
    const headerToken = client.handshake.headers?.authorization;
    if (
      headerToken &&
      typeof headerToken === 'string' &&
      headerToken.startsWith('Bearer ')
    ) {
      return headerToken.substring(7);
    }

    return null;
  }

  handleDisconnect(client: Socket) {
    // ✅ D2: تنظيف rate limiting عند قطع الاتصال
    this.messageRates.delete(client.id);
    // console.log('Client disconnected', client.id);
  }

  /**
   * ✅ D2: التحقق من معدل إرسال الرسائل (Anti-spam)
   */
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const rateData = this.messageRates.get(clientId);

    if (!rateData) {
      // أول رسالة للعميل
      this.messageRates.set(clientId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    // تحقق من انتهاء النافزة الزمنية
    if (now > rateData.resetTime) {
      // إعادة تعيين العداد
      this.messageRates.set(clientId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW,
      });
      return true;
    }

    // تحقق من تجاوز الحد
    if (rateData.count >= this.RATE_LIMIT_MAX) {
      return false; // تجاوز الحد
    }

    // زيادة العداد
    rateData.count++;
    return true;
  }

  /**
   * ✅ D2: معالجة تجاوز معدل الإرسال
   */
  private handleRateLimitExceeded(client: Socket): void {
    this.logger.warn(`Rate limit exceeded for client: ${client.id}`);

    // إرسال تحذير للعميل
    client.emit('rate_limit_exceeded', {
      message: 'تم تجاوز حد الرسائل المسموح، الرجاء الإبطاء',
      retryAfter: this.RATE_LIMIT_WINDOW / 1000, // بالثواني
    });

    // قطع الاتصال في حالة التجاوز المفرط
    const rateData = this.messageRates.get(client.id);
    if (rateData && rateData.count > this.RATE_LIMIT_MAX * 2) {
      this.logger.warn(
        `Disconnecting client due to excessive rate limit violations: ${client.id}`,
      );
      client.disconnect(true);
    }
  }

  // انضمام/مغادرة ديناميكي (اختياري)
  @SubscribeMessage('join')
  onJoin(
    @MessageBody()
    body: { sessionId?: string; merchantId?: string; rooms?: string[] },
    @ConnectedSocket() client: Socket,
  ) {
    // ✅ D2: تطبيق rate limiting
    if (!this.checkRateLimit(client.id)) {
      this.handleRateLimitExceeded(client);
      return { error: 'Rate limit exceeded' };
    }

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
    // ✅ D2: تطبيق rate limiting
    if (!this.checkRateLimit(client.id)) {
      this.handleRateLimitExceeded(client);
      return { error: 'Rate limit exceeded' };
    }

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
    // ✅ D2: تطبيق rate limiting (أقل صرامة للـ typing)
    if (!this.checkRateLimit(client.id)) {
      // للـ typing، لا نقطع الاتصال، فقط نتجاهل
      return;
    }

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
