import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const STATIC_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://app.kaleem-ai.com',
  'https://kaleem-ai.com',
];

// يسمح بأي ساب دومين على النطاق الرسمي (مثال: https://merchant.kaleem-ai.com)
const KALEEM_SUBDOMAIN = /^https:\/\/([a-z0-9-]+\.)*kaleem-ai\.com$/i;

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    // بدون Origin (curl/server-to-server) -> اسمح
    if (!origin) return cb(null, true);

    const allowed =
      STATIC_ORIGINS.includes(origin) || KALEEM_SUBDOMAIN.test(origin);

    // مهم: لو غير مسموح، نرجّع خطأ، عشان ما يضيف الهيدرز
    cb(allowed ? null : new Error('CORS_NOT_ALLOWED'), allowed);
  },
  credentials: true, // لو بتستخدم كوكيز عبر الدومينات
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Authorization',
    'Content-Type',
    'X-Request-Id',
    'X-Idempotency-Key',
    'X-Signature',
    'X-Timestamp',
  ],
  exposedHeaders: [
    'X-Request-Id',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // Cache لطلبات preflight يوم كامل
  optionsSuccessStatus: 204,
};
