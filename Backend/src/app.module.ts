import fs from 'fs';
import { randomUUID } from 'node:crypto';
import path, { join } from 'path';

// -------------------- External --------------------

import { BullModule, BullModuleOptions } from '@nestjs/bull';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nJsonLoader,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import { LoggerModule } from 'nestjs-pino';

// -------------------- Internal --------------------

import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
  AppConfig,
  CommonModule,
  CommonServicesModule,
  ErrorManagementModule,
} from './common';
import { CacheModule } from './common/cache/cache.module';
import { varsConfig } from './common/config/vars.config';
import { NonceController } from './common/controllers/nonce.controller';
import { IdempotencyGuard } from './common/guards/idempotency.guard';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ServiceTokenGuard } from './common/guards/service-token.guard';
import { ThrottlerTenantGuard } from './common/guards/throttler-tenant.guard';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';
import { PerformanceTrackingInterceptor } from './common/interceptors/performance-tracking.interceptor';
import { OutboxDispatcher } from './common/outbox/outbox.dispatcher';
import { OutboxModule } from './common/outbox/outbox.module';
import { DatabaseConfigModule } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { RedisModule } from './config/redis.module';
import { configuration } from './configuration';
import { DispatchersModule } from './infra/dispatchers/dispatchers.module';
import { RabbitModule } from './infra/rabbit/rabbit.module';
import { AmqpMetrics, AmqpMetricsProviders } from './metrics/amqp.metrics';
import { MetricsModule } from './metrics/metrics.module';
import { AiModule } from './modules/ai/ai.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ChannelsModule } from './modules/channels/channels.module';
import { ChatModule } from './modules/chat/chat.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { FaqModule } from './modules/faq/faq.module';
import { InstructionsModule } from './modules/instructions/instructions.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ZidModule } from './modules/integrations/zid/zid.module';
import { KleemModule } from './modules/kleem/kleem.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { LeadsModule } from './modules/leads/leads.module';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { MessagingModule } from './modules/messaging/message.module';
import { N8nWorkflowModule } from './modules/n8n-workflow/n8n-workflow.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OffersModule } from './modules/offers/offers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProductsModule } from './modules/products/products.module';
import { PublicModule } from './modules/public/public.module';
import { ScraperModule } from './modules/scraper/scraper.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { SupportModule } from './modules/support/support.module';
import { SystemModule } from './modules/system/system.module';
import { UsersModule } from './modules/users/users.module';
import { VectorModule } from './modules/vector/vector.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { WorkflowHistoryModule } from './modules/workflow-history/workflow-history.module';
import { AiReplyWorkerModule } from './workers/ai-reply.worker.module';
import { WebhookDispatcherWorkerModule } from './workers/webhook-dispatcher.worker.module';

import type { ConfigFactory } from '@nestjs/config';
import type {
  IncomingMessage,
  ServerResponse,
  IncomingHttpHeaders,
} from 'http';
import type { Options as PinoHttpOptions, ReqId as PinoReqId } from 'pino-http';

// -------------------- Local helpers --------------------
const isTsRuntime = __filename.endsWith('.ts');
const IS_TEST_MIN = process.env.APP_MINIMAL_BOOT === '1';

function resolveI18nPath(): string {
  const distPath = path.join(__dirname, 'i18n');
  const srcPath = path.join(process.cwd(), 'src', 'i18n');
  return fs.existsSync(distPath) ? distPath : srcPath;
}

const devPath = path.join(process.cwd(), 'src', 'i18n');
const compiledPath1 = path.join(__dirname, 'i18n');
const compiledPath2 = path.join(process.cwd(), 'dist', 'i18n');

const i18nPath = isTsRuntime
  ? devPath
  : fs.existsSync(compiledPath1)
    ? compiledPath1
    : fs.existsSync(compiledPath2)
      ? compiledPath2
      : compiledPath1;

// Nest logger بدلاً من console
Logger.log(`[I18N] path -> ${i18nPath} | ts=${isTsRuntime}`, 'AppModule');

// نوع آمن لطلباتنا (بدون any)
type ExtendedReq = IncomingMessage & {
  user?: { sub?: string; merchantId?: string };
  id?: string | number;
  ip?: string;
  connection?: { remoteAddress?: string };
};

// قراءة header بنوع IncomingHttpHeaders لتفادي any/unknown
const getHeader = (req: IncomingMessage, name: string): string | undefined => {
  const hdrs: IncomingHttpHeaders =
    (req as { headers?: IncomingHttpHeaders }).headers ?? {};
  const v = hdrs[name.toLowerCase()];
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0];
  return undefined;
};

@Module({
  imports: [
    // Logger (Pino)
    LoggerModule.forRoot(
      IS_TEST_MIN
        ? { pinoHttp: { enabled: false } }
        : {
            pinoHttp: {
              level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',

              redact: {
                paths: [
                  'req.headers.authorization',
                  'req.headers.cookie',
                  'req.headers["x-hub-signature-256"]',
                  'req.headers["x-telegram-bot-api-secret-token"]',
                  'req.headers["x-evolution-apikey"]',
                  'req.headers.apikey',
                  'req.headers["x-timestamp"]',
                  'req.headers["x-idempotency-key"]',
                  'req.headers["set-cookie"]',
                  'req.body.password',
                  'req.body.confirmPassword',
                  'req.body.refreshToken',
                  'req.body.accessToken',
                  'req.body.token',
                  'req.body.secret',
                  'req.body.apikey',
                  'req.body.appSecret',
                  'req.body.verifyToken',
                  'res.headers["set-cookie"]',
                  'responseTime',
                ],
                censor: '[REDACTED]',
              },

              autoLogging: {
                ignore: (req: IncomingMessage): boolean => {
                  const ignoredRoutes = ['/metrics', '/health', '/api/health'];
                  const url = req.url ?? '';
                  return ignoredRoutes.includes(url);
                },
              },

              customLogLevel: (
                _req: IncomingMessage,
                res: ServerResponse<IncomingMessage>,
                err?: unknown,
              ) => {
                const status = res.statusCode ?? 200;
                if (status >= 400 && status < 500) return 'warn';
                if (status >= 500 || err) return 'error';
                return 'info';
              },

              // يجب أن تُرجع دائماً ReqId (بدون undefined)
              genReqId: (req: IncomingMessage): PinoReqId => {
                const fromHeader = getHeader(req, 'x-request-id');
                if (typeof fromHeader === 'string' && fromHeader.length > 0) {
                  return fromHeader;
                }
                const r = req as ExtendedReq;
                if (typeof r.id === 'string' || typeof r.id === 'number') {
                  return r.id;
                }
                // fallback آمن
                return randomUUID();
              },

              formatters: {
                level: (label: string) => ({ level: label }),
              },

              customProps: (req: IncomingMessage) => {
                const r = req as ExtendedReq;
                const userAgent = getHeader(req, 'user-agent');
                const requestId = getHeader(req, 'x-request-id');
                const ip = r.ip ?? r.connection?.remoteAddress;

                return {
                  service: 'kaleem-api',
                  requestId: requestId ?? r.id,
                  userId: r.user?.sub,
                  merchantId: r.user?.merchantId,
                  userAgent,
                  ip,
                };
              },
            } satisfies PinoHttpOptions<
              IncomingMessage,
              ServerResponse<IncomingMessage>
            >, // تدقيق صارم
          },
    ),

    // الواردات الأساسية: في الاختبار المصغّر نأخذ الحد الأدنى
    ...(IS_TEST_MIN
      ? [CommonModule, CommonServicesModule]
      : [
          MetricsModule,
          SystemModule,
          CommonModule,
          CommonServicesModule,
          ErrorManagementModule,
          CacheModule,
        ]),

    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),

    // Auth stack
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),

    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration, varsConfig] as ConfigFactory[],
    }),

    // i18n
    I18nModule.forRoot({
      fallbackLanguage: 'ar',
      loader: I18nJsonLoader,
      loaderOptions: {
        path: resolveI18nPath(),
        watch: process.env.NODE_ENV !== 'production' && !IS_TEST_MIN, // لا مراقبة ملفات في الاختبار
      },
      resolvers: [
        { use: QueryResolver, options: ['lang', 'locale'] },
        new HeaderResolver(['x-lang']),
        AcceptLanguageResolver,
      ],
    }),

    // لا نخدم ملفات ولا جداول زمنية ولا أوتبوكس ولا رابت ولا بول أثناء الاختبار المصغّر
    ...(IS_TEST_MIN
      ? []
      : [
          ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
          }),

          // Infra
          ScheduleModule.forRoot(),
          RedisModule,
          OutboxModule,
          RabbitModule,

          // Bull (Redis) for queues
          BullModule.forRootAsync({
            imports: [RedisModule, ConfigModule],
            useFactory: (config: ConfigService): BullModuleOptions => {
              const url = config.get<string>('REDIS_URL');
              if (!url) throw new Error('REDIS_URL not defined');
              const parsed = new URL(url);
              return {
                redis: {
                  host: parsed.hostname,
                  port: parseInt(parsed.port, 10),
                  password: parsed.password || '',
                  tls: parsed.protocol === 'rediss:' ? {} : {},
                },
              };
            },
            inject: [ConfigService],
          }),

          // Database
          DatabaseConfigModule,
        ]),

    // ميزات الدومين: في الاختبار المصغّر إمّا نستبعدها أو نأخذ الحد الأدنى
    ...(IS_TEST_MIN
      ? []
      : [
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
          PublicModule,
          DispatchersModule,
        ]),
  ],
  providers: [
    AppService,
    // نفس الفكرة للحُرّاس والاعتراضات
    ...(IS_TEST_MIN
      ? []
      : [
          { provide: APP_GUARD, useClass: JwtAuthGuard },
          { provide: APP_GUARD, useClass: ThrottlerTenantGuard },
          ...AmqpMetricsProviders,
          AmqpMetrics,
          { provide: APP_GUARD, useClass: RolesGuard },
          ServiceTokenGuard,
          IdempotencyGuard,
          RedisConfig,
          OutboxDispatcher,
          HttpMetricsInterceptor,
          PerformanceTrackingInterceptor,
        ]),
  ],
  exports: IS_TEST_MIN ? [] : [AmqpMetrics],
  controllers: [AppController, NonceController],
})
export class AppModule extends AppConfig {}
