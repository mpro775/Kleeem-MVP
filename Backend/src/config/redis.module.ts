// src/config/redis.module.ts
import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

import { RedisConfig } from './redis.config';

@Global()
@Module({
  providers: [
    RedisConfig,
    {
      provide: 'IORedisClient',
      inject: [RedisConfig],
      useFactory: (config: RedisConfig) => {
        return new Redis(config.connection);
      },
    },
  ],
  exports: ['IORedisClient', RedisConfig],
})
export class RedisModule {}
