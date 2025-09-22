// WebSocket configuration
import { IoAdapter } from '@nestjs/platform-socket.io';

import { corsOptions } from '../common/config/cors.config';

import type { INestApplication } from '@nestjs/common';
import type { ServerOptions } from 'socket.io';

// WebSocket configuration constants
const PING_TIMEOUT = 60000;
const PING_INTERVAL = 25000;
const UPGRADE_TIMEOUT = 10000;
const MAX_HTTP_BUFFER_SIZE = 1e6;

class WsAdapter extends IoAdapter {
  override createIOServer(port: number, options?: ServerOptions) {
    const ioCors = {
      origin: corsOptions.origin as any,
      methods: corsOptions.methods || ['GET', 'POST'],
      allowedHeaders: corsOptions.allowedHeaders,
      credentials: corsOptions.credentials || true,
      maxAge: corsOptions.maxAge,
    };
    const baseOptions = {
      path: '/api/chat',
      serveClient: false,
      cors: ioCors,
      allowEIO3: false,
      pingTimeout: PING_TIMEOUT,
      pingInterval: PING_INTERVAL,
      upgradeTimeout: UPGRADE_TIMEOUT,
      maxHttpBufferSize: MAX_HTTP_BUFFER_SIZE,
      allowRequest: async (req: any, callback: any) => {
        const ok =
          typeof corsOptions.origin === 'function'
            ? await this.isOriginFnAllowed(
                req.headers.origin,
                corsOptions.origin,
              )
            : true;
        callback(null, ok);
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return super.createIOServer(
      port,
      options ? { ...baseOptions, ...options } : baseOptions,
    );
  }

  private isOriginFnAllowed(
    origin: string | undefined,
    originFn: any,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!origin) return resolve(false);
      try {
        originFn(origin, (err: any, allowed: boolean) =>
          resolve(!err && !!allowed),
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
