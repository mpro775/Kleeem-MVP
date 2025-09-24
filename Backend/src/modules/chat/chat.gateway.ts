// src/features/chat/chat.gateway.ts
// ========== External imports ==========
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { OnModuleInit, Inject, Logger, Injectable } from '@nestjs/common';
import { JwtService, JwtVerifyOptions } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { createAdapter } from '@socket.io/redis-adapter';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { createClient } from 'redis';

import type { Cache } from 'cache-manager';
import type { Gauge } from 'prom-client';
import type { Server, Socket } from 'socket.io';

// ========== Constants (no magic numbers) ==========
const WS_PATH = '/api/chat' as const;
const ORIGINS: readonly string[] = [
  'http://localhost:5173',
  'https://app.kaleem-ai.com',
  'https://kaleem-ai.com',
] as const;

const TRANSPORTS: readonly ('websocket' | 'polling')[] = [
  'websocket',
  'polling',
] as const;

const SECONDS = 1_000;
const MINUTES = 60 * SECONDS;
const WINDOW_10_MIN_MS = 10 * MINUTES;
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_DISCONNECT_MULTIPLIER = 2;

const REDIS_FALLBACK_URL = 'redis://redis:6379';
const BLACKLIST_PREFIX = 'bl:';

// ========== Types ==========
interface RateState {
  count: number;
  resetTime: number;
}

interface JwtWsPayload {
  jti: string;
  userId: string;
  role: string;
  merchantId?: string | null;
  exp?: number;
  iss?: string;
  aud?: string;
  sub?: string;
}

interface JoinLeavePayload {
  sessionId?: string;
  merchantId?: string;
  rooms?: string[];
}

interface TypingPayload {
  sessionId?: string;
  role?: string;
}

interface OutgoingMessage {
  id: string;
  text: string;
  role: 'user' | 'agent' | 'system' | 'bot' | 'customer';
  merchantId?: string;
  timestamp?: Date | number;
  rating?: number | null;
  feedback?: string | null;
  metadata?: Record<string, unknown>;
}

// ========== Type guards & utils ==========
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function hasString(v: unknown, key: string): v is Record<string, string> {
  return isRecord(v) && typeof v[key] === 'string';
}

function asBoolean(v: unknown): boolean {
  return v === true || v === '1' || v === 1 || v === 'true';
}

function extractTokenFromHandshake(client: Socket): string | null {
  // auth.token
  const authTok = (client.handshake as unknown as Record<string, unknown>).auth;
  if (hasString(authTok, 'token')) return authTok.token;

  // query.token
  const q = client.handshake.query;
  if (hasString(q, 'token')) return q.token;

  // headers.authorization
  const h = client.handshake.headers?.authorization;
  if (typeof h === 'string' && h.startsWith('Bearer ')) return h.slice(7);

  return null;
}

function isJwtWsPayload(v: unknown): v is JwtWsPayload {
  return (
    isRecord(v) && typeof v.jti === 'string' && typeof v.userId === 'string'
  );
}

function getHeaderString(client: Socket, name: string): string | undefined {
  const h = client.handshake.headers?.[name];
  return typeof h === 'string' ? h : undefined;
}

@Injectable()
@WebSocketGateway({
  path: WS_PATH,
  cors: { origin: ORIGINS, credentials: true },
  transports: TRANSPORTS as ('websocket' | 'polling')[],
})
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(ChatGateway.name);

  // تتبّع معدل الرسائل لكل socket
  private readonly messageRates = new Map<string, RateState>();

  // خيارات تحقق JWT (إن أردت تفعيلها؛ وإلا سيستخدم verify الافتراضي)
  private readonly jwtVerifyOptions: JwtVerifyOptions = {
    // secret: process.env.JWT_SECRET, // يفضّل حقنه عبر ConfigService وتمريره هنا
    // issuer: process.env.JWT_ISSUER,
    // audience: process.env.JWT_AUDIENCE,
  };

  constructor(
    private readonly jwtService: JwtService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @InjectMetric('websocket_active_connections')
    private readonly wsGauge: Gauge<string>,
  ) {}

  // ---------- Module init ----------
  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL || REDIS_FALLBACK_URL;
    const pub = createClient({ url });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    this.server.adapter(createAdapter(pub, sub));
  }

  // ---------- Connection lifecycle ----------
  async handleConnection(client: Socket): Promise<void> {
    try {
      if (!(await this.authenticateWsClient(client))) {
        this.logger.warn(
          `Unauthorized WebSocket connection attempt: ${client.id}`,
        );
        client.emit('error', { message: 'Unauthorized' });
        client.disconnect(true);
        return;
      }

      const query = client.handshake.query as Record<
        string,
        string | undefined
      >;
      const sessionId = query.sessionId;
      const role = (query.role ?? '').toLowerCase();
      const merchantId = query.merchantId;

      if (sessionId) void client.join(sessionId);
      if (merchantId) void client.join(`merchant:${merchantId}`);
      if (role === 'admin' || role === 'agent') {
        void client.join('admin');
        void client.join('agents');
      }

      this.logger.debug(
        `WebSocket client connected: ${client.id} (session: ${sessionId ?? '-'})`,
      );
      this.wsGauge.inc({ namespace: 'chat' });
    } catch (error) {
      this.logger.error(
        `WebSocket connection error: ${(error as Error)?.message ?? String(error)}`,
      );
      client.emit('error', { message: 'Connection failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.messageRates.delete(client.id);
    this.wsGauge.dec({ namespace: 'chat' });
  }

  // ---------- Auth ----------
  private async authenticateWsClient(client: Socket): Promise<boolean> {
    try {
      const token = extractTokenFromHandshake(client);
      if (!token) return false;

      const decodedUnknown = this.jwtService.verify(
        token,
        this.jwtVerifyOptions,
      ) as unknown;
      if (!isJwtWsPayload(decodedUnknown)) return false;

      // blacklist check
      const blacklistKey = `${BLACKLIST_PREFIX}${decodedUnknown.jti}`;
      const isBlacklisted = await this.cacheManager.get(blacklistKey);
      if (asBoolean(isBlacklisted)) return false;

      (client.data as Record<string, unknown>).user = {
        userId: decodedUnknown.userId,
        role: decodedUnknown.role,
        merchantId: decodedUnknown.merchantId ?? null,
        jti: decodedUnknown.jti,
      };

      // مثال: قراءة IP/UA إن احتجت
      const _ip = client.handshake.address;
      const _ua = getHeaderString(client, 'user-agent');
      void _ip;
      void _ua;

      return true;
    } catch {
      return false;
    }
  }

  // ---------- Rate limiting ----------
  private checkRateLimit(clientId: string): boolean {
    const now = Date.now();
    const rate = this.messageRates.get(clientId);

    if (!rate || now > rate.resetTime) {
      this.messageRates.set(clientId, {
        count: 1,
        resetTime: now + WINDOW_10_MIN_MS,
      });
      return true;
    }

    if (rate.count >= RATE_LIMIT_MAX) return false;

    rate.count += 1;
    return true;
  }

  private handleRateLimitExceeded(client: Socket): void {
    this.logger.warn(`Rate limit exceeded for client: ${client.id}`);
    client.emit('rate_limit_exceeded', {
      message: 'تم تجاوز حد الرسائل المسموح، الرجاء الإبطاء',
      retryAfter: WINDOW_10_MIN_MS / SECONDS, // بالثواني
    });

    const rate = this.messageRates.get(client.id);
    if (
      rate &&
      rate.count > RATE_LIMIT_MAX * RATE_LIMIT_DISCONNECT_MULTIPLIER
    ) {
      this.logger.warn(
        `Disconnecting client due to excessive violations: ${client.id}`,
      );
      client.disconnect(true);
    }
  }

  // ---------- Room management ----------
  @SubscribeMessage('join')
  onJoin(
    @MessageBody() body: JoinLeavePayload,
    @ConnectedSocket() client: Socket,
  ): { ok?: true; error?: string } {
    if (!this.checkRateLimit(client.id)) {
      this.handleRateLimitExceeded(client);
      return { error: 'Rate limit exceeded' };
    }

    if (body?.sessionId) void client.join(body.sessionId);
    if (body?.merchantId) void client.join(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => void client.join(r));
    return { ok: true };
  }

  @SubscribeMessage('leave')
  onLeave(
    @MessageBody() body: JoinLeavePayload,
    @ConnectedSocket() client: Socket,
  ): { ok?: true; error?: string } {
    if (!this.checkRateLimit(client.id)) {
      this.handleRateLimitExceeded(client);
      return { error: 'Rate limit exceeded' };
    }

    if (body?.sessionId) void client.leave(body.sessionId);
    if (body?.merchantId) void client.leave(`merchant:${body.merchantId}`);
    body?.rooms?.forEach((r) => void client.leave(r));
    return { ok: true };
  }

  // ---------- Typing ----------
  @SubscribeMessage('typing')
  onTyping(
    @MessageBody() payload: TypingPayload,
    @ConnectedSocket() client: Socket,
  ): void {
    // للـ typing، لا نقطع الاتصال على تجاوز المعدل، فقط نتجاهل
    if (!this.checkRateLimit(client.id)) return;

    if (!payload?.sessionId) return;
    const role = (payload.role ?? 'user') === 'agent' ? 'agent' : 'user';
    this.server.to(payload.sessionId).emit('typing', {
      sessionId: payload.sessionId,
      role,
    });
  }

  // ---------- Outgoing message broadcaster ----------
  /** يُستدعى من الخدمة عند حفظ رسالة جديدة */
  sendMessageToSession(sessionId: string, message: OutgoingMessage): void {
    // للعميلين في نفس الجلسة
    this.server.to(sessionId).emit('message', message);

    // بث للمشرفين (توافقية قديمة)
    this.server.to('admin').emit('admin_new_message', { sessionId, message });

    // بث لكل مستخدمي لوحة نفس التاجر (إن توفّر)
    if (message.merchantId) {
      this.server.to(`merchant:${message.merchantId}`).emit('message', {
        sessionId,
        ...message,
      });
    }
  }
}
