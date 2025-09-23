import type { Cache } from 'cache-manager';

const DEFAULT_IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours

/**
 * يحاول وضع مفتاح إديمبوتنسي في الكاش لمدة ttlSec ثوانٍ.
 * يعيد true إذا كان هذا الطلب "مكرر" (المفتاح موجود مسبقًا)، و false إن كان جديدًا وتم وضعه الآن.
 */
export async function preventDuplicates(
  cache: Cache,
  key: string,
  ttlSec = DEFAULT_IDEMPOTENCY_TTL_SECONDS, // 24h
): Promise<boolean> {
  // هل موجود؟
  const exists = await cache.get(key);
  if (exists) return true;

  // ضعّه مع TTL بالثواني (صيغة Nest الصحيحة)
  await cache.set(key, true, ttlSec);
  return false;
}

/** مولّد مفاتيح مريحة */
export function idemKey(opts: {
  provider: 'telegram' | 'whatsapp_qr' | 'wa_cloud' | 'internal';
  channelId?: string;
  merchantId?: string;
  messageId: string | number;
}): string {
  const parts = [
    'idem',
    'webhook',
    sanitize(opts.provider),
    opts.channelId ? `ch:${sanitize(opts.channelId)}` : '',
    opts.merchantId ? `m:${sanitize(opts.merchantId)}` : '',
    `msg:${sanitize(String(opts.messageId))}`,
  ].filter(Boolean);
  return parts.join(':');
}

function sanitize(v: string): string {
  return v.replace(/[^a-zA-Z0-9_\-:.]/g, '').slice(0, 200);
}
