// src/common/utils/logger.utils.ts

/**
 * ✅ G1: تنظيف headers من البيانات الحساسة
 */
export function sanitizeHeaders(
  headers: Record<string, any>,
): Record<string, any> {
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

  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(headers || {})) {
    const lowerKey = key.toLowerCase();

    if (sensitiveHeaders.includes(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * ✅ G1: تنظيف body من البيانات الحساسة
 */
export function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sensitiveFields = [
    'password',
    'confirmPassword',
    'refreshToken',
    'accessToken',
    'token',
    'secret',
    'apikey',
    'appSecret',
    'verifyToken',
    'signature',
  ];

  const sanitized: any = Array.isArray(body) ? [] : {};

  for (const [key, value] of Object.entries(body)) {
    const lowerKey = key.toLowerCase();

    if (sensitiveFields.some((field) => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // تنظيف متداخل للكائنات
      sanitized[key] = sanitizeBody(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
