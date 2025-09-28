// External imports
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-ioredis';

// Internal imports
import { MetricsModule } from '../../metrics/metrics.module';

// Local imports
import { CacheWarmerOrchestrator } from './cache-warmer.orchestrator';
import { CacheController } from './cache.controller';
import { CacheMetrics } from './cache.metrics';
import { CacheService } from './cache.service';
import {
  CACHE_TTL_5_MINUTES,
  CACHE_MAX_ITEMS,
  REDIS_DEFAULT_DB,
  REDIS_RETRY_DELAY_ON_FAILOVER,
  REDIS_DEFAULT_PORT,
} from './constant';
import { CacheWarmer } from './warmers/cache-warmer.interface';
import { CategoriesWarmer } from './warmers/categories.warmer';
import { MerchantsWarmer } from './warmers/merchants.warmer';
import { PlansWarmer } from './warmers/plans.warmer';
import { ProductsWarmer } from './warmers/products.warmer';

@Global()
@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    MetricsModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new Error('REDIS_URL is not defined');
        }

        const url = new URL(redisUrl);

        return {
          store: redisStore,
          host: url.hostname,
          port: parseInt(url.port) || REDIS_DEFAULT_PORT,
          password: url.password || undefined,
          db: REDIS_DEFAULT_DB,
          ttl: CACHE_TTL_5_MINUTES, // 5 دقائق افتراضي
          max: CACHE_MAX_ITEMS, // حد أقصى للعناصر في الكاش
          // إعدادات إضافية لـ Redis
          retryDelayOnFailover: REDIS_RETRY_DELAY_ON_FAILOVER,
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
  providers: [
    CacheService,
    CacheMetrics,
    CategoriesWarmer,
    MerchantsWarmer,
    PlansWarmer,
    ProductsWarmer,
    {
      provide: 'CACHE_WARMERS',
      useFactory: (
        categoriesWarmer: CategoriesWarmer,
        merchantsWarmer: MerchantsWarmer,
        plansWarmer: PlansWarmer,
        productsWarmer: ProductsWarmer,
      ): CacheWarmer[] => [
        categoriesWarmer,
        merchantsWarmer,
        plansWarmer,
        productsWarmer,
      ],
      inject: [CategoriesWarmer, MerchantsWarmer, PlansWarmer, ProductsWarmer],
    },
    {
      provide: CacheWarmerOrchestrator,
      useFactory: (warmers: CacheWarmer[]) =>
        new CacheWarmerOrchestrator(warmers),
      inject: ['CACHE_WARMERS'],
    },
  ],
  controllers: [CacheController],
  exports: [CacheService, CacheWarmerOrchestrator],
})
export class CacheModule {}
