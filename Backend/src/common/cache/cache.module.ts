import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-ioredis';
import { CacheService } from './cache.service';
import { CacheWarmerService } from './cache-warmer.service';
import { CacheController } from './cache.controller';
import { CacheMetrics } from './cache.metrics';

@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined');
        }

        const url = new URL(redisUrl);

        return {
          store: redisStore,
          host: url.hostname,
          port: parseInt(url.port) || 6379,
          password: url.password || undefined,
          db: 0,
          ttl: 300, // 5 دقائق افتراضي
          max: 1000, // حد أقصى للعناصر في الكاش
          // إعدادات إضافية لـ Redis
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          // إعدادات TLS للإنتاج
          ...(url.protocol === 'rediss:' && {
            tls: {
              rejectUnauthorized: false,
            },
          }),
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
  ],
  providers: [CacheService, CacheWarmerService, CacheMetrics],
  controllers: [CacheController],
  exports: [CacheService, CacheWarmerService],
})
export class CacheModule {}
