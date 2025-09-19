// Rate limiting configuration
import { INestApplication } from '@nestjs/common';
import rateLimit from 'express-rate-limit';

// Rate limiting constants
const ONE_MINUTE_MS = 60_000;
const ONE_SECOND_MS = 1000;
const FIFTEEN_MINUTES_MULTIPLIER = 15;
const FIFTEEN_MINUTES_MS = FIFTEEN_MINUTES_MULTIPLIER * ONE_MINUTE_MS;

const WEBHOOK_MAX_REQUESTS = 180;
const AUTH_MAX_REQUESTS = 30;
const WHATSAPP_MAX_REQUESTS = 20;

const HTTP_TOO_MANY_REQUESTS = 429;

export function configureRateLimits(app: INestApplication): void {
  app.use(
    '/api/webhooks',
    rateLimit({
      windowMs: ONE_MINUTE_MS,
      max: WEBHOOK_MAX_REQUESTS,
      message: {
        status: HTTP_TOO_MANY_REQUESTS,
        code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد الطلبات للويبهوكس، الرجاء المحاولة لاحقاً',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    '/api/auth',
    rateLimit({
      windowMs: FIFTEEN_MINUTES_MS,
      max: AUTH_MAX_REQUESTS,
      message: {
        status: HTTP_TOO_MANY_REQUESTS,
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد طلبات المصادقة، الرجاء المحاولة لاحقاً',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use(
    '/api/whatsapp/reply',
    rateLimit({
      windowMs: ONE_SECOND_MS,
      max: WHATSAPP_MAX_REQUESTS,
      message: {
        status: HTTP_TOO_MANY_REQUESTS,
        code: 'WHATSAPP_REPLY_RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد ردود WhatsApp، الرجاء المحاولة لاحقاً',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
}
