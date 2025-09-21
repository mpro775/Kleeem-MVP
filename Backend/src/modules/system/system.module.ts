import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../common/cache/cache.module';
import { RedisModule } from '@nestjs-modules/ioredis';

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
