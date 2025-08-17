// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';
import { BullModule, BullModuleOptions } from '@nestjs/bull';

import { LoggerModule } from 'nestjs-pino';

import configuration from './configuration';
import { DatabaseConfigModule } from './config/database.config';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { PlansModule } from './modules/plans/plans.module';
import { ScraperModule } from './modules/scraper/scraper.module';

import { RolesGuard } from './common/guards/roles.guard';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { MessagingModule } from './modules/messaging/message.module';
import { RedisConfig } from './config/redis.config';
import { RedisModule } from './config/redis.module';
import { N8nWorkflowModule } from './modules/n8n-workflow/n8n-workflow.module';
import { WorkflowHistoryModule } from './modules/workflow-history/workflow-history.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { VectorModule } from './modules/vector/vector.module';
import { ChatModule } from './modules/chat/chat.module';
import { LeadsModule } from './modules/leads/leads.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { OrdersModule } from './modules/orders/orders.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { FaqModule } from './modules/faq/faq.module';
import { ZidModule } from './modules/integrations/zid/zid.module';
import { KleemModule } from './modules/kleem/kleem.module';
import { AmqpMetrics, AmqpMetricsProviders } from './metrics/amqp.metrics';
import { RabbitModule } from './infra/rabbit/rabbit.module';
import { OutboxModule } from './common/outbox/outbox.module';
import { OutboxDispatcher } from './common/outbox/outbox.dispatcher';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    // Logger (Pino)
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
      },
    }),
    MetricsModule,
    // فعّل Passport و JWT هنا
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    // Config
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Cache (Redis)
    CacheModule.register({
      isGlobal: true,
      store: redisStore,
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      ttl: 30,
    }),

    // Scheduler
    ScheduleModule.forRoot(),
    RedisModule,
    OutboxModule,
    RabbitModule,
    // Bull (Redis) for queues
    BullModule.forRootAsync({
      imports: [RedisModule],
      useFactory: (config: ConfigService): BullModuleOptions => {
        const url = config.get<string>('REDIS_URL');
        if (!url) throw new Error('REDIS_URL not defined');
        const parsed = new URL(url);
        return {
          redis: {
            host: parsed.hostname,
            port: parseInt(parsed.port, 10),
            password: parsed.password || undefined,
            tls: parsed.protocol === 'rediss:' ? {} : undefined,
          },
        };
      },
      inject: [ConfigService],
    }),
    // Database
    DatabaseConfigModule,

    // Feature modules
    AnalyticsModule,

    AuthModule,
    UsersModule,
    ProductsModule,
    MessagingModule,
    MerchantsModule,
    PlansModule,
    VectorModule,
    ChatModule,
    DocumentsModule,
    N8nWorkflowModule,
    OrdersModule,
    KnowledgeModule,
    FaqModule,
    WorkflowHistoryModule,
    WebhooksModule,
    CategoriesModule,
    StorefrontModule,
    ZidModule,
    LeadsModule,
    IntegrationsModule,
    ScraperModule,
    KleemModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    ...AmqpMetricsProviders,
    AmqpMetrics,
    // 1) Guard للأدوار
    { provide: APP_GUARD, useClass: RolesGuard },
    RedisConfig,
    OutboxDispatcher,
    // 3) Interceptor لجمع المقاييس على كل طلب HTTP
  ],
  exports: [AmqpMetrics],
})
export class AppModule {}
