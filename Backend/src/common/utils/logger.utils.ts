// src/common/utils/logger.utils.ts

/**
 * ✅ G1: تنظيف headers من البيانات الحساسة
 */
export function sanitizeHeaders(
  headers: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  const sensitiveHeaders = [
    'authorization',
    'cookie',
    'x-hub-signature-256',
    'x-telegram-bot-api-secret-token',
    'x-evolution-apikey',
    'apikey',
    'x-timestamp',
    'x-idempotency-key',
    'set-cookie',
  ];

  const input = headers ?? {};
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    const lowerKey = key.toLowerCase();
    sanitized[key] = sensitiveHeaders.includes(lowerKey) ? '[REDACTED]' : value;
  }

  return sanitized;
}

/**
 * ✅ G1: تنظيف body من البيانات الحساسة
 */
export function sanitizeBody(body: unknown): unknown {
  if (!isObject(body)) return body;

  const sensitiveFields = [
    'password',
    'confirmpassword',
    'refreshtoken',
    'accesstoken',
    'token',
    'secret',
    'apikey',
    'appsecret',
    'verifytoken',
    'signature',
  ];

  if (Array.isArray(body)) {
    return body.map((item) => sanitizeBody(item));
  }

  const obj = body;
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some((field) => lowerKey.includes(field))) {
      result[key] = '[REDACTED]';
    } else if (isObject(value)) {
      // تنظيف متداخل للكائنات/المصفوفات
      result[key] = sanitizeBody(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// -----------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> | unknown[] {
  return typeof v === 'object' && v !== null;
}
