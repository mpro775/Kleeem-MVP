// src/config/redis.module.ts
import { Module, Global } from '@nestjs/common';
import { RedisConfig } from './redis.config';

@Global()
@Module({
  providers: [RedisConfig],
  exports: [RedisConfig],
})
export class RedisModule {}
