// src/bootstrap/configure-swagger.ts
import { JwtService } from '@nestjs/jwt';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nService } from 'nestjs-i18n';

import { i18nizeSwagger } from './i18nize-swagger';

import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';

// HTTP status constants
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;

function buildSwaggerDoc(
  app: INestApplication,
  isProd: boolean,
): OpenAPIObject {
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

  const raw = SwaggerModule.createDocument(app, cfg, { deepScanRoutes: true });
  const i18n = app.get(I18nService);
  const lang = process.env.SWAGGER_LANG || 'ar';
  return i18nizeSwagger(
    raw,
    i18n as I18nService<Record<string, unknown>>,
    lang,
  );
}

function protectSwaggerWithJwt(app: INestApplication): void {
  app.use('/api/docs*', (req: Request, res: Response, next: NextFunction) => {
    const h = req.headers.authorization;
    if (!h?.startsWith('Bearer ')) {
      return res
        .status(HTTP_UNAUTHORIZED)
        .json({ success: false, code: 'UNAUTHORIZED_DOCS_ACCESS' });
    }
    try {
      const jwt = app.get(JwtService);
      jwt.verify(h.split(' ')[1], { secret: process.env.JWT_SECRET });
      next();
    } catch {
      return res
        .status(HTTP_FORBIDDEN)
        .json({ success: false, code: 'INVALID_JWT_DOCS_ACCESS' });
    }
  });
}

function setupSwaggerUI(
  app: INestApplication,
  doc: OpenAPIObject,
  isProd: boolean,
): void {
  const opts = {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      displayRequestDuration: true,
    },
    customSiteTitle: isProd
      ? 'Kaleem API Docs - Production'
      : 'Kaleem API Docs',
    customfavIcon: isProd ? undefined : 'https://kaleem-ai.com/favicon.ico',
    customCssUrl: isProd
      ? undefined
      : 'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
  };
  SwaggerModule.setup('api/docs', app, doc, opts);
}

export function configureSwagger(app: INestApplication): void {
  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) protectSwaggerWithJwt(app);
  const doc = buildSwaggerDoc(app, isProd);
  setupSwaggerUI(app, doc, isProd);
}
