// src/common/config/app.config.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestIdMiddleware } from '../middlewares/request-id.middleware';

/** تكوين التطبيق مع المكونات المشتركة */
export class AppConfig implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware)
      .forRoutes('*');
  }
}

/** دالة مساعدة لإعداد التطبيق */
export function setupApp(app: any) {
  // إعداد CORS
  app.enableCors({
    origin: [
      'http://localhost:5173', // الواجهة الأمامية (Vite)
      'http://127.0.0.1:5173',
      'https://app.kaleem-ai.com',
      'https://kaleem-ai.com',
    ],
    credentials: true,
  });

  // إعداد Helmet للأمان
  app.use(require('helmet')());

  // إعداد Rate Limiting
  const rateLimit = require('express-rate-limit');
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: 500, // حد أقصى 100 طلب لكل IP
      message: {
        status: 429,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد الطلبات، الرجاء المحاولة لاحقاً',
      },
    })
  );

  // إعداد Compression
  app.use(require('compression')());

  return app;
}
