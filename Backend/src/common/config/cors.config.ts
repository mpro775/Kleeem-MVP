import {
  CORS_DEFAULT_MAX_AGE_SECONDS,
  CORS_DEFAULT_OPTIONS_SUCCESS_STATUS,
} from '../constants/common';

import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

const parseList = (v?: string, fallback: string[] = []) => {
  const items = (v ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
};

const parseBool = (v?: string, fallback = false) =>
  v ? /^(1|true|yes|on)$/i.test(v) : fallback;

const parseNum = (v?: string, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 1) Origins الثابتة من env (مع قيم افتراضية مساوية للكود القديم)
const STATIC_ORIGINS = parseList(process.env.CORS_STATIC_ORIGINS, [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://app.kaleem-ai.com',
  'https://kaleem-ai.com',
]);

// 2) Regex للساب دومين مبني على الدومين في env
const BASE_DOMAIN = (
  process.env.CORS_ALLOW_SUBDOMAIN_BASE || 'kaleem-ai.com'
).trim();
const ALLOW_PORTS_ON_SUBDOMAINS = parseBool(
  process.env.CORS_SUBDOMAIN_ALLOW_PORTS,
  false,
);
const portPart = ALLOW_PORTS_ON_SUBDOMAINS ? '(?::\\d{2,5})?' : '';
// يسمح بـ https://{anything}.{BASE_DOMAIN} (+ منفذ اختياري إن مفعّل)
const KALEEM_SUBDOMAIN = new RegExp(
  `^https:\\/\\/([a-z0-9-]+\\.)*${escapeRegex(BASE_DOMAIN)}${portPart}$`,
  'i',
);

// 3) سلوك إضافي من env
const ALLOW_EMPTY_ORIGIN = parseBool(process.env.CORS_ALLOW_EMPTY_ORIGIN, true);
const ALLOW_ALL = parseBool(process.env.CORS_ALLOW_ALL, false);

export const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (ALLOW_ALL) return cb(null, true);

    // بدون Origin (curl/server-to-server)
    if (!origin) return cb(null, ALLOW_EMPTY_ORIGIN);

    // إزالة / في النهاية لتوحيد المقارنة
    const normalized = origin.replace(/\/+$/, '');

    const allowed =
      STATIC_ORIGINS.includes(normalized) || KALEEM_SUBDOMAIN.test(normalized);

    // مهم: إن لم يُسمح، رجّع Error ليتم منع إضافة هيدرز CORS
    cb(allowed ? null : new Error('CORS_NOT_ALLOWED'), allowed);
  },

  credentials: parseBool(process.env.CORS_CREDENTIALS, true),

  // يفضل تمرير Array هنا
  methods: parseList(process.env.CORS_METHODS, [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ]),

  allowedHeaders: parseList(process.env.CORS_ALLOWED_HEADERS, [
    'Authorization',
    'Content-Type',
    'X-Request-Id',
    'X-Idempotency-Key',
    'X-Signature',
    'X-Timestamp',
    'Idempotency-Key',
    'X-Kaleem-Timestamp',
    'X-Kaleem-Nonce',
    'X-Kaleem-Signature',
  ]),

  exposedHeaders: parseList(process.env.CORS_EXPOSED_HEADERS, [
    'x-request-id',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ]),

  maxAge: parseNum(process.env.CORS_MAX_AGE, CORS_DEFAULT_MAX_AGE_SECONDS),
  optionsSuccessStatus: parseNum(
    process.env.CORS_OPTIONS_SUCCESS_STATUS,
    CORS_DEFAULT_OPTIONS_SUCCESS_STATUS,
  ),
};
