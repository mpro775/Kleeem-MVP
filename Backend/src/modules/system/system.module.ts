import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';

import { CacheModule } from '../../common/cache/cache.module';

import { HealthController } from './health.controller';

@Module({
  imports: [
    MongooseModule,
    CacheModule,
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL,
      }),
    }),
  ],
  controllers: [HealthController],
})
export class SystemModule {}
