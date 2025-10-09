// WebSocket configuration
import { IoAdapter } from '@nestjs/platform-socket.io';

import { corsOptions } from '../common/config/cors.config';
import {
  PING_TIMEOUT,
  PING_INTERVAL,
  UPGRADE_TIMEOUT,
  MAX_HTTP_BUFFER_SIZE,
} from '../common/constants/common';

import type { INestApplication } from '@nestjs/common';
import type { IncomingMessage } from 'http';
import type { ServerOptions } from 'socket.io';
import type { Server as SocketServer } from 'socket.io';

// توقيع دالة الـ origin المقبول من socket.io
type OriginFn = (
  origin: string,
  callback: (err: string | undefined, allowed: boolean) => void,
) => void;

class WsAdapter extends IoAdapter {
  override createIOServer(port: number, options?: Partial<ServerOptions>) {
    // استخدم نفس نوع الخاصية cors من ServerOptions
    const ioCors: NonNullable<ServerOptions['cors']> = {
      origin: true, // Handle origin checking in allowRequest
      methods: corsOptions.methods ?? ['GET', 'POST'],
      allowedHeaders: corsOptions.allowedHeaders,
      credentials: corsOptions.credentials ?? true,
      maxAge: corsOptions.maxAge,
    };

    const baseOptions: Partial<ServerOptions> = {
      path: '/api/chat',
      serveClient: false,
      cors: ioCors,
      allowEIO3: false,
      pingTimeout: PING_TIMEOUT,
      pingInterval: PING_INTERVAL,
      upgradeTimeout: UPGRADE_TIMEOUT,
      maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE,
      allowRequest: (
        req: IncomingMessage,
        callback: (err: string | null | undefined, success: boolean) => void,
      ): void => {
        // لو origin عبارة عن دالة، نتحقق منها بطريقة آمنة الأنواع
        if (typeof corsOptions.origin === 'function') {
          void this.isOriginFnAllowed(
            (req as { headers?: { origin?: string } }).headers?.origin,
            corsOptions.origin as unknown as OriginFn,
          ).then((allowed) => callback(undefined, allowed));
          return;
        }
        // غير كذا نسمح
        callback(undefined, true);
      },
    };

    const merged: Partial<ServerOptions> = options
      ? { ...baseOptions, ...options }
      : baseOptions;

    return super.createIOServer(port, merged) as SocketServer;
  }

  private isOriginFnAllowed(
    origin: string | undefined,
    originFn: OriginFn,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!origin) return resolve(false);
      try {
        originFn(origin, (err: string | undefined, allowed: boolean) =>
          resolve(!err && allowed),
        );
      } catch {
        resolve(false);
      }
    });
  }
}

export function configureWebsocket(app: INestApplication): void {
  app.useWebSocketAdapter(new WsAdapter(app));
}
