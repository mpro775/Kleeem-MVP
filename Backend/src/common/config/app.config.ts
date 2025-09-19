// src/common/config/app.config.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from '../middlewares/request-id.middleware';
import { corsOptions } from './cors.config';
import { ConfigService } from '@nestjs/config';

export function setupApp(app: any, config: ConfigService) {
  // CORS كما هو (إن رغبت تركه هنا)
  app.enableCors(corsOptions);

  app.use((_req, res, next) => {
    res.vary('Origin');
    next();
  });

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
                'connect-src': ["'self'"],
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
      xssFilter: true,
    }),
  );

  app.use(
    rateLimit({
      windowMs: config.get<number>('vars.rateLimit.windowMs')!,
      max: config.get<number>('vars.rateLimit.max')!,
      message: {
        status: 429,
        code: config.get<string>('vars.rateLimit.message.code')!,
        message: config.get<string>('vars.rateLimit.message.text')!,
      },
      standardHeaders: true,
      legacyHeaders: false,
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
  configure(consumer: MiddlewareConsumer) {
    // تطبيق RequestIdMiddleware على جميع المسارات
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
