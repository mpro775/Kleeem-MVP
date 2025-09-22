// src/config/redis.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RedisOptions } from 'ioredis';

@Injectable()
export class RedisConfig {
  public readonly connection: RedisOptions;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) throw new Error('REDIS_URL not defined');

    const parsed = new URL(url);

    this.connection = {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10),
      // Username موجود قبل النقطتين في الـ URL
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      // Render يستخدم TLS
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
  }
}
