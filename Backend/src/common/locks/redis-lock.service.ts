import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';

import type Redis from 'ioredis';

@Injectable()
export class RedisLockService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async tryLock(key: string, ttlMs = 5 * 60_000): Promise<boolean> {
    // SET key "1" NX PX ttl
    const ok = await this.redis.set(`lock:${key}`, '1', 'PX', ttlMs, 'NX');
    return ok === 'OK';
  }

  async unlock(key: string) {
    await this.redis.del(`lock:${key}`);
  }
}
