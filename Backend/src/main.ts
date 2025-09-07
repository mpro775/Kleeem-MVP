import './tracing';
import './polyfills';
import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  if (typeof globalThis.crypto === 'undefined') {
    (globalThis as any).crypto = { randomUUID };
  }

  app.useWebSocketAdapter(new IoAdapter(app));

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

  // ✅ JSON + URL-encoded لكل المسارات
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
  // ⚠️ Parse JSON عادي لكن خزّن الـ raw buffer للتحقق من توقيع Meta
  const captureRaw = (req: any, _res: any, buf: Buffer) => {
    if (buf?.length) req.rawBody = Buffer.from(buf); // للاستخدام لاحقًا في التحقق
  };
  app.use(
    '/api/webhooks',
    bodyParser.json({ limit: '2mb', verify: captureRaw }),
  );
  app.use(
    '/api/webhooks',
    bodyParser.urlencoded({ extended: true, limit: '2mb', verify: captureRaw }),
  );
  // (اختياري) **بعد** الـ parsers: لوج تشخيصي
  app.use('/api/merchants/:id/prompt/preview', (req, _res, next) => {
    console.log(
      '🔎 PREVIEW PARSED BODY:',
      req.headers['content-type'],
      req.body,
    );
    next();
  });
  // Swagger
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
    .setContact('Kaleem Team', 'https://kaleem-ai.com', 'support@kaleem-ai.com')
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

  app.set('trust proxy', 1);

  // حد تردد خاص بمسار الردود (احتراز ضد اللفات)
  app.use('/api/whatsapp/reply', rateLimit({ windowMs: 1000, max: 20 }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Backend running on http://localhost:${port}/api`);
}

void bootstrap();
