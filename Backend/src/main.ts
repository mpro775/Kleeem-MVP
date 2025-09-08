import './tracing';
import './polyfills';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import rateLimit from 'express-rate-limit';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { setupApp } from './common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ErrorLoggingInterceptor } from './common/interceptors/error-logging.interceptor';
import { PerformanceTrackingInterceptor } from './common/interceptors/performance-tracking.interceptor';
import * as bodyParser from 'body-parser';
import { ServerOptions } from 'socket.io';
import { corsOptions } from './common/config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // ✅ F1: التحقق من متغيرات البيئة الحرجة قبل البدء
  const envValidator = app.get('EnvironmentValidatorService');
  envValidator.validateOrExit();
  envValidator.logEnvironmentSummary();

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  if (typeof globalThis.crypto === 'undefined') {
    (globalThis as any).crypto = { randomUUID };
  }
  // ✅ D1: WsAdapter موحّد مع إعدادات محسّنة
  class WsAdapter extends IoAdapter {
    override createIOServer(port: number, options?: ServerOptions) {
      // تحويل CORS إلى ما يقبله Socket.IO من corsOptions الموحدة
      const ioCors = {
        origin: corsOptions.origin as any, // تدعم string[] أو RegExp أو function
        methods: corsOptions.methods || ['GET', 'POST'],
        allowedHeaders: corsOptions.allowedHeaders,
        credentials: corsOptions.credentials || true,
        maxAge: corsOptions.maxAge,
      };

      // ✅ D1: إعدادات موحّدة ومحسّنة
      const baseOptions = {
        path: '/api/chat', // ✅ موحّد مع ChatGateway والفرونت
        serveClient: false, // ✅ منع تقديم client files
        cors: ioCors,
        // إعدادات أمان إضافية
        allowEIO3: false, // منع Engine.IO v3 القديم
        pingTimeout: 60000, // مهلة ping (60 ثانية)
        pingInterval: 25000, // فترة ping (25 ثانية)
        upgradeTimeout: 10000, // مهلة الترقية (10 ثواني)
        maxHttpBufferSize: 1e6, // حد أقصى للبيانات (1MB)
        allowRequest: (req: any, callback: any) => {
          // فحص إضافي للطلبات (اختياري)
          const origin = req.headers.origin;
          const isAllowed = this.isOriginAllowed(origin, corsOptions.origin);
          callback(null, isAllowed);
        },
      };

      // دمج الخيارات المخصصة مع الأساسية
      const wsOptions = options ? { ...baseOptions, ...options } : baseOptions;

      return super.createIOServer(port, wsOptions);
    }

    /**
     * التحقق من أن الأصل مسموح
     */
    private isOriginAllowed(
      origin: string | undefined,
      allowedOrigins: any,
    ): boolean {
      if (!origin) return false;

      if (typeof allowedOrigins === 'string') {
        return origin === allowedOrigins;
      }

      if (Array.isArray(allowedOrigins)) {
        return allowedOrigins.includes(origin);
      }

      if (allowedOrigins instanceof RegExp) {
        return allowedOrigins.test(origin);
      }

      if (typeof allowedOrigins === 'function') {
        return allowedOrigins(origin);
      }

      return false;
    }
  }

  app.useWebSocketAdapter(new WsAdapter(app));

  // إعداد التطبيق مع المكونات المشتركة
  setupApp(app);

  // إضافة فلتر الأخطاء المحسن
  const allExceptionsFilter = app.get(AllExceptionsFilter);
  app.useGlobalFilters(allExceptionsFilter);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      // اختياري: لو DTO فيه حقول إضافية مثل audience
      forbidNonWhitelisted: false,
    }),
  );

  const logger = app.get(PinoLogger);
  app.useLogger(logger);

  // إضافة الإنترسبتورات
  app.useGlobalInterceptors(
    app.get(HttpMetricsInterceptor),
    app.get(ErrorLoggingInterceptor), // إضافة إنترسبتور تسجيل الأخطاء
    app.get(PerformanceTrackingInterceptor), // إضافة إنترسبتور تتبع الأداء
  );

  // ✅ Body parsing مُحسّن مع حدود مناسبة

  // تحضير دالة حفظ Raw Body للويبهوكس
  const captureRawBody = (req: any, _res: any, buf: Buffer) => {
    if (buf?.length) {
      req.rawBody = Buffer.from(buf); // مطلوب للتحقق من توقيعات الويبهوكس
    }
  };

  // ✅ مسارات الويبهوكس أولاً - مع Raw Body وحد 2MB
  app.use(
    '/api/webhooks',
    bodyParser.json({
      limit: '2mb',
      verify: captureRawBody,
      type: 'application/json',
    }),
  );
  app.use(
    '/api/webhooks',
    bodyParser.urlencoded({
      extended: true,
      limit: '2mb',
      verify: captureRawBody,
    }),
  );

  // ✅ باقي المسارات - حد 5MB للمسارات العامة
  app.use(
    bodyParser.json({
      limit: '5mb',
      type: 'application/json',
    }),
  );
  app.use(
    bodyParser.urlencoded({
      extended: true,
      limit: '5mb',
    }),
  );

  // Raw body للمسارات التي تحتاجها (مثل دفع الدفع)
  app.use(
    bodyParser.raw({
      limit: '1mb',
      type: 'application/octet-stream',
    }),
  );

  // Text parsing للمسارات النصية
  app.use(
    bodyParser.text({
      limit: '1mb',
      type: 'text/plain',
    }),
  );

  // (اختياري) **بعد** الـ parsers: لوج تشخيصي
  if (process.env.NODE_ENV !== 'production') {
    app.use('/api/merchants/:id/prompt/preview', (req, _res, next) => {
      console.log(
        '🔎 PREVIEW PARSED BODY:',
        req.headers['content-type'],
        req.body,
      );
      next();
    });
  }
  // Swagger - حماية في الإنتاج
  if (process.env.NODE_ENV !== 'production') {
    // في التطوير: Swagger مفتوح بدون حماية
    const config = new DocumentBuilder()
      .setTitle('Kaleem API')
      .setDescription('API documentation for Kaleem')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .setContact(
        'Kaleem Team',
        'https://kaleem-ai.com',
        'support@kaleem-ai.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('http://localhost:3000', 'Local environment')
      .addServer('https://api.kaleem-ai.com', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
    });
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        displayRequestDuration: true,
      },
      customSiteTitle: 'Kaleem API Docs',
      customfavIcon: 'https://kaleem-ai.com/favicon.ico',
      customCssUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
    });
  } else {
    // في الإنتاج: حماية Swagger بـ JWT
    const config = new DocumentBuilder()
      .setTitle('Kaleem API')
      .setDescription('API documentation for Kaleem - Production Environment')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token',
          in: 'header',
        },
        'access-token',
      )
      .setContact(
        'Kaleem Team',
        'https://kaleem-ai.com',
        'support@kaleem-ai.com',
      )
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addServer('https://api.kaleem-ai.com', 'Production')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      deepScanRoutes: true,
    });

    // حماية مسار Swagger بـ JWT
    app.use('/api/docs*', (req: any, res: any, next: any) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          success: false,
          message: 'غير مصرح - يتطلب رمز JWT صالح للوصول للوثائق',
          code: 'UNAUTHORIZED_DOCS_ACCESS',
        });
        return;
      }

      const token = authHeader.split(' ')[1];
      try {
        // استخدام JWT service للتحقق من الرمز
        const jwtService = app.get(JwtService);
        jwtService.verify(token, { secret: process.env.JWT_SECRET });
        next();
      } catch (error) {
        res.status(403).json({
          success: false,
          message: 'رمز JWT غير صالح للوصول للوثائق',
          code: 'INVALID_JWT_DOCS_ACCESS',
        });
      }
    });

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'list',
        displayRequestDuration: true,
      },
      customSiteTitle: 'Kaleem API Docs - Production',
    });
  }

  app.set('trust proxy', 1);

  // ✅ Rate Limits خاصة - يجب أن تكون قبل الحد العام

  // حد تردد للويبهوكس - 180 طلب في الدقيقة
  app.use(
    '/api/webhooks',
    rateLimit({
      windowMs: 60 * 1000, // دقيقة واحدة
      max: 180,
      message: {
        status: 429,
        code: 'WEBHOOK_RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد الطلبات للويبهوكس، الرجاء المحاولة لاحقاً',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // حد تردد للمصادقة - 30 طلب في 15 دقيقة
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 دقيقة
      max: 30,
      message: {
        status: 429,
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد طلبات المصادقة، الرجاء المحاولة لاحقاً',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // حد تردد خاص بمسار الردود (احتراز ضد اللفات)
  app.use(
    '/api/whatsapp/reply',
    rateLimit({
      windowMs: 1000, // ثانية واحدة
      max: 20,
      message: {
        status: 429,
        code: 'WHATSAPP_REPLY_RATE_LIMIT_EXCEEDED',
        message: 'تم تجاوز حد ردود WhatsApp، الرجاء المحاولة لاحقاً',
      },
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}

void bootstrap();
