import { Injectable } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';

import { MILLISECONDS_PER_MINUTE } from '../cache/constant';

import type Redis from 'ioredis';

@Injectable()
export class RedisLockService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async tryLock(
    key: string,
    ttlMs = 5 * MILLISECONDS_PER_MINUTE,
  ): Promise<boolean> {
    // SET key "1" NX PX ttl
    const ok = await this.redis.set(`lock:${key}`, '1', 'PX', ttlMs, 'NX');
    return ok === 'OK';
  }

  async unlock(key: string): Promise<void> {
    await this.redis.del(`lock:${key}`);
  }
}
