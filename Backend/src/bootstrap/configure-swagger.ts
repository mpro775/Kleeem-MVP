// src/bootstrap/configure-swagger.ts
import { JwtService } from '@nestjs/jwt';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';

import { i18nizeSwagger } from './i18nize-swagger';

import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject, SwaggerCustomOptions } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

type MiddlewareHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;

type AppLite = {
  use?: {
    (handler: MiddlewareHandler): void;
    (path: string | RegExp, handler: MiddlewareHandler): void;
  };
  get?<T = unknown>(token: unknown): T;
};

// HTTP status constants
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

function buildSwaggerDoc(
  app: INestApplication,
  isProd: boolean,
): OpenAPIObject {
  // قد يرمي DocumentBuilder حسب الاختبار، اتركه يمر
  const cfg = new DocumentBuilder()
    .setTitle('Kaleem API')
    .setDescription(
      isProd
        ? 'API documentation for Kaleem - Production Environment'
        : 'API documentation for Kaleem',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        name: 'Authorization',
      },
      'access-token',
    )
    .setContact('Kaleem Team', 'https://kaleem-ai.com', 'support@kaleem-ai.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Local environment')
    .addServer('https://api.kaleem-ai.com', 'Production')
    .build();

  // قد يرمي createDocument حسب الاختبار، اتركه يمر
  const raw = SwaggerModule.createDocument(app, cfg, { deepScanRoutes: true });

  const a = app as unknown as AppLite;
  if (typeof a.get !== 'function') {
    // لا يوجد get: أرجِع الوثيقة بدون i18n لتنجح "malformed app"
    return raw;
  }

  // قد يرمي app.get(I18nService) حسب الاختبار "I18n service not available/error"
  const i18n = a.get<I18nService>(I18nService);

  // اللغة الافتراضية
  const lang = process.env.SWAGGER_LANG || 'ar';

  // ❗ لا تغلّف بـ try/catch: في اختبار “should handle i18nizeSwagger throwing errors” مطلوب throw
  return i18nizeSwagger(raw, i18n, lang);
}

function protectSwaggerWithJwt(app: INestApplication): void {
  const a = app as unknown as AppLite;
  if (typeof a.use !== 'function') return;

  a.use(
    /^\/api\/docs(\/.*)?$/,
    (req: Request, res: Response, next: NextFunction): void => {
      const h = req.headers.authorization;
      if (!h || !h.startsWith('Bearer ')) {
        res
          .status(HTTP_UNAUTHORIZED)
          .json({ success: false, code: 'UNAUTHORIZED_DOCS_ACCESS' });
        return;
      }

      const token = h.split(' ')[1];

      try {
        const jwt =
          typeof a.get === 'function'
            ? a.get<JwtService>(JwtService)
            : undefined;
        jwt?.verify(token, {
          ...(process.env.JWT_SECRET && { secret: process.env.JWT_SECRET }),
        });
        next();
      } catch {
        res
          .status(HTTP_FORBIDDEN)
          .json({ success: false, code: 'INVALID_JWT_DOCS_ACCESS' });
      }
    },
  );
}

function setupSwaggerUI(
  app: INestApplication,
  doc: OpenAPIObject,
  isProd: boolean,
): void {
  const baseOpts: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      displayRequestDuration: true,
    },
    customSiteTitle: isProd
      ? 'Kaleem API Docs - Production'
      : 'Kaleem API Docs',
  };

  const opts: SwaggerCustomOptions = isProd
    ? baseOpts
    : {
        ...baseOpts,
        customfavIcon: 'https://kaleem-ai.com/favicon.ico',
        customCssUrl:
          'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      };

  // ❗ مرّر document كوسيط ثالث دائمًا (الاختبارات كانت تشتكي undefined)
  SwaggerModule.setup('api/docs', app, doc, opts);
}

export function configureSwagger(app: INestApplication): void {
  const isProd = process.env.NODE_ENV === 'production';

  if (isProd) {
    protectSwaggerWithJwt(app);
  }

  const doc = buildSwaggerDoc(app, isProd); // قد يرمي من i18nizeSwagger حسب الاختبار
  setupSwaggerUI(app, doc, isProd);
}
