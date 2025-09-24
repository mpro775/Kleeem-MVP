// src/modules/webhooks/utils/cache.util.ts
import type { Cache } from 'cache-manager';

const MS_IN_SECOND = 1000;

export async function getIdempotency(
  cache: Cache,
  key: string,
): Promise<boolean> {
  const existing = await cache.get<boolean>(key);
  return Boolean(existing);
}

export async function setIdempotency(
  cache: Cache,
  key: string,
  ttlMs: number,
): Promise<void> {
  const ttlSeconds = Math.ceil(ttlMs / MS_IN_SECOND);
  await cache.set(key, true, ttlSeconds);
}
