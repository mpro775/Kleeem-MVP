// src/config/redis.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { RedisOptions } from 'ioredis';

const DEFAULT_REDIS_PORT = 6379;

@Injectable()
export class RedisConfig {
  public readonly connection: RedisOptions;

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) throw new Error('REDIS_URL not defined');

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      // سيصل لها اختبار "invalid-url"
      throw new Error('Invalid REDIS_URL');
    }

    const port = parsed.port ? parseInt(parsed.port, 10) : DEFAULT_REDIS_PORT;

    const connection: Partial<RedisOptions> = {
      host: parsed.hostname || '127.0.0.1',
      port: Number.isFinite(port) ? port : DEFAULT_REDIS_PORT,
    };

    if (parsed.username) connection.username = parsed.username;
    if (parsed.password) connection.password = parsed.password;
    if (parsed.protocol === 'rediss:') connection.tls = {};

    this.connection = connection as RedisOptions;
  }
}
