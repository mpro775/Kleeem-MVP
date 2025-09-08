// src/common/config/app.config.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from '../middlewares/request-id.middleware';
import { corsOptions } from './cors.config';

export function setupApp(app: any) {
  // CORS متقدم
  app.enableCors(corsOptions);

  // ينفع مع CDN: تضمن عدم تلوّث الكاش
  app.use((_req, res, next) => {
    res.vary('Origin'); // احترازيًا
    next();
  });

  app.use(
    helmet({
      // CSP للإنتاج فقط مع السماح للـ CDN المطلوب
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production'
          ? {
              useDefaults: true,
              directives: {
                'default-src': ["'self'"],
                'img-src': ["'self'", 'data:', 'https:'],
                'script-src': [
                  "'self'",
                  "'unsafe-inline'", // مطلوب للـ Swagger
                  'https://cdnjs.cloudflare.com', // CDN للـ Swagger
                ],
                'style-src': [
                  "'self'",
                  "'unsafe-inline'", // مطلوب للـ Swagger
                  'https://cdnjs.cloudflare.com', // CDN للـ Swagger
                ],
                'font-src': ["'self'", 'https://cdnjs.cloudflare.com'],
                'connect-src': ["'self'"],
              },
            }
          : false,
      // إعدادات الأمان المحسّنة
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
      hsts: {
        maxAge: 31536000, // سنة واحدة
        includeSubDomains: true,
        preload: true,
      },
      // إطفاء x-powered-by لإخفاء معلومات الخادم
      xPoweredBy: false,
      // إعدادات إضافية للأمان
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500, // (ملاحظة: التعليق في كودك يقول 100، هنا مضبوط 500 فعليًا)
      message: {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً',
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
