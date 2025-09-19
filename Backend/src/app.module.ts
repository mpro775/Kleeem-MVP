// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import * as redisStore from 'cache-manager-ioredis';
import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { I18nModule, I18nJsonLoader } from 'nestjs-i18n';

import { LoggerModule } from 'nestjs-pino';

import configuration from './configuration';
import varsConfig from './common/config/vars.config';
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
import path, { join } from 'path';
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
import { ThrottlerModule } from '@nestjs/throttler';
import { InstructionsModule } from './modules/instructions/instructions.module';
import { AiModule } from './modules/ai/ai.module';
import { SupportModule } from './modules/support/support.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { SystemModule } from './modules/system/system.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { OffersModule } from './modules/offers/offers.module';
import {
  CommonModule,
  AppConfig,
  ErrorManagementModule,
  CommonServicesModule,
} from './common';
import { PublicModule } from './modules/public/public.module';
import { CacheModule } from './common/cache/cache.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DispatchersModule } from './infra/dispatchers/dispatchers.module';
import { WebhookDispatcherWorkerModule } from './workers/webhook-dispatcher.worker.module';
import { AiReplyWorkerModule } from './workers/ai-reply.worker.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import fs from 'fs';
const devPath = path.join(process.cwd(), 'src', 'i18n'); // أثناء start:dev (ts-node)
const compiledPath1 = path.join(__dirname, 'i18n'); // dist/src/i18n
const compiledPath2 = path.join(process.cwd(), 'dist', 'i18n'); // dist/i18n (بديل)
const isTsRuntime = __filename.endsWith('.ts');
// I18n for internationalization
function resolveI18nPath() {
  const distPath = path.join(__dirname, 'i18n'); // عند التشغيل من dist: dist/src/i18n
  const srcPath = path.join(process.cwd(), 'src', 'i18n'); // عند التشغيل بـ ts-node
  return fs.existsSync(distPath) ? distPath : srcPath;
}

// اختر المسار اعتماداً على وضع التشغيل فعلاً، لا على NODE_ENV
const i18nPath = isTsRuntime
  ? devPath
  : fs.existsSync(compiledPath1)
    ? compiledPath1
    : fs.existsSync(compiledPath2)
      ? compiledPath2
      : compiledPath1;
console.log(`[I18N] path -> ${i18nPath} | ts=${isTsRuntime}`);

@Module({
  imports: [
    // Logger (Pino) مع Redaction للبيانات الحساسة
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        // ✅ G1: إخفاء البيانات الحساسة من السجلات
        redact: {
          paths: [
            // Headers حساسة
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-hub-signature-256"]',
            'req.headers["x-telegram-bot-api-secret-token"]',
            'req.headers["x-evolution-apikey"]',
            'req.headers.apikey',
            'req.headers["x-timestamp"]',
            'req.headers["x-idempotency-key"]',
            'req.headers["set-cookie"]',
            // Body fields حساسة
            'req.body.password',
            'req.body.confirmPassword',
            'req.body.refreshToken',
            'req.body.accessToken',
            'req.body.token',
            'req.body.secret',
            'req.body.apikey',
            'req.body.appSecret',
            'req.body.verifyToken',
            // Response fields حساسة
            'res.headers["set-cookie"]',
            'responseTime',
          ],
          censor: '[REDACTED]',
        },
        // تحسين الأداء
        autoLogging: {
          ignore: (req: any) => {
            // تجاهل مسارات المراقبة والصحة
            const ignoredRoutes = ['/metrics', '/health', '/api/health'];
            return ignoredRoutes.some((route) => req.url === route);
          },
        },
        customLogLevel: (req: any, res: any, err: any) => {
          if (res.statusCode >= 400 && res.statusCode < 500) {
            return 'warn';
          } else if (res.statusCode >= 500 || err) {
            return 'error';
          }
          return 'info';
        },
        // إضافة correlation ID للتتبع
        genReqId: (req: any) => req.headers['X-Request-Id'] || req.id,
        // تحسين تنسيق الإنتاج
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        // إضافة معلومات السياق
        customProps: (req: any) => ({
          service: 'kaleem-api',
          requestId: req.headers['X-Request-Id'] || req.id,
          userId: req.user?.sub,
          merchantId: req.user?.merchantId,
          userAgent: req.headers['user-agent'],
          ip: req.ip || req.connection?.remoteAddress,
        }),
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60, limit: 20 }]),
    MetricsModule,
    SystemModule,
    CommonModule,
    CommonServicesModule, // إضافة وحدة الخدمات المشتركة
    ErrorManagementModule, // إضافة وحدة إدارة الأخطاء
    CacheModule, // إضافة وحدة الكاش
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
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
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, varsConfig],
    }),

    I18nModule.forRoot({
      fallbackLanguage: 'ar',
      loader: I18nJsonLoader,
      loaderOptions: {
        path: resolveI18nPath(),
        watch: process.env.NODE_ENV !== 'production',
      },
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
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
    SupportModule,
    PlansModule,
    AiReplyWorkerModule,
    WebhookDispatcherWorkerModule,
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
    InstructionsModule,
    OffersModule,
    AiModule,
    ChannelsModule,
    NotificationsModule,
    CatalogModule,
    OffersModule,
    PublicModule,
    DispatchersModule,
  ],
  providers: [
    AppService,
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
  controllers: [AppController],
})
export class AppModule extends AppConfig {}
