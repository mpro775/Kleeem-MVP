// src/common/config/app.config.ts
import compression from 'compression';
import helmet from 'helmet';

import { RequestIdMiddleware } from '../middlewares/request-id.middleware';

import { corsOptions } from './cors.config';

import type {
  INestApplication,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Request, Response, NextFunction } from 'express';

export function setupApp(
  app: INestApplication & {
    use: (
      middleware: (req: Request, res: Response, next: NextFunction) => void,
    ) => void;
    enableCors: (options?: unknown) => void;
  },
  config: ConfigService,
): INestApplication {
  // CORS كما هو (إن رغبت تركه هنا)
  app.enableCors(corsOptions);

  app.use(
    (
      _req: Request,
      res: Response & { vary: (field: string) => Response },
      next: NextFunction,
    ) => {
      res.vary('Origin');
      next();
    },
  );

  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? {
              useDefaults: true,
              directives: {
                'default-src': ["'self'"],
                'img-src': ["'self'", 'data:', 'https:'],
                'script-src': [
                  "'self'",
                  "'unsafe-inline'",
                  'https://cdnjs.cloudflare.com',
                ],
                'style-src': [
                  "'self'",
                  "'unsafe-inline'",
                  'https://cdnjs.cloudflare.com',
                ],
                'font-src': ["'self'", 'https://cdnjs.cloudflare.com'],
                'connect-src': [
                  "'self'",
                  // أضف وجهات خارجية حسب الحاجة:
                  // "https://sentry.io",
                  // "https://glitchtip.yourdomain.com"
                ],
              },
            }
          : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: {
        maxAge: config.get<number>('vars.security.hstsMaxAge')!,
        includeSubDomains: true,
        preload: true,
      },
      xPoweredBy: false,
      frameguard: { action: 'deny' },
      noSniff: true,
    }),
  );

  app.use(compression());
  return app;
}

/**
 * AppConfig class that configures middleware for the application
 * This class should be extended by AppModule to automatically apply RequestIdMiddleware
 */
export class AppConfig implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // تطبيق RequestIdMiddleware على جميع المسارات
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
