// src/common/swagger/swagger.factory.ts
import * as fs from 'fs';
import * as path from 'path';

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject, SwaggerCustomOptions } from '@nestjs/swagger';

type AnyObj = Record<string, unknown>;
const RESPONSE_TIME_P95_MS = 500;
const AI_RESPONSE_TIME_P95_MS = 5000;
const AVAILABILITY = 99.9;
const ERROR_RATE_PCT = 0.1;
const UPDATE_ID_EXAMPLE = 1234567;
const MESSAGE_ID_EXAMPLE = 42;
const JSON_INDENT_SPACES = 2;

/* --------------------------- small helpers --------------------------- */

function createSwaggerConfig(version: string, isProd: boolean) {
  return new DocumentBuilder()
    .setTitle('Kaleem API')
    .setDescription(
      isProd
        ? 'API documentation for Kaleem - Production'
        : 'API documentation for Kaleem',
    )
    .setVersion(version)
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Paste your JWT here',
      },
      'bearer',
    )
    .addTag('Products', 'إدارة وعرض وبحث المنتجات')
    .addTag('Channels', 'قنوات الربط (WhatsApp/Telegram/Instagram/Web)')
    .addTag('AI', 'خدمات الذكاء الاصطناعي (RAG/Embeddings/LLM)')
    .addTag('Knowledge', 'إدارة مصادر المعرفة و الوثائق')
    .addServer('http://localhost:3000/api', 'Local')
    .addServer('https://api.kaleem-ai.com/api', 'Production')
    .build();
}

function createBaseDoc(
  app: INestApplication,
  config: ReturnType<typeof createSwaggerConfig>,
) {
  const doc = SwaggerModule.createDocument(app, config, {
    deepScanRoutes: true,
  }) as OpenAPIObject & AnyObj;
  (doc as AnyObj).openapi = '3.1.0';
  // مخططات الأمان: JWT + CSRF (apiKey بالهيدر)
  (doc.components ||= {}).securitySchemes = {
    ...(doc.components.securitySchemes || {}),
    bearer: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    csrf: {
      type: 'apiKey',
      in: 'header',
      name: 'X-CSRF-Token',
      description: 'Anti-CSRF token',
    },
  };
  doc.components ||= {};
  doc.components.schemas ||= {};
  return doc;
}

function addSLOExtensions(doc: OpenAPIObject & AnyObj) {
  doc['x-slos'] = {
    responseTimeP95Ms: RESPONSE_TIME_P95_MS,
    aiResponseTimeP95Ms: AI_RESPONSE_TIME_P95_MS,
    availability: AVAILABILITY,
    errorRatePct: ERROR_RATE_PCT,
  };
  doc['x-grafana'] = {
    application: 'https://grafana.kaleem-ai.com/d/application-metrics',
    database: 'https://grafana.kaleem-ai.com/d/database-metrics',
    ai: 'https://grafana.kaleem-ai.com/d/ai-metrics',
  };
}

function addWebhookSchemas(doc: OpenAPIObject & AnyObj) {
  doc.components!.schemas!.WhatsAppInbound = {
    type: 'object',
    properties: {
      from: { type: 'string', example: '9665xxxxxxx' },
      text: { type: 'string', example: 'وش عندكم؟' },
      timestamp: { type: 'string', format: 'date-time' },
    },
    required: ['from', 'timestamp'],
  };
  doc.components!.schemas!.TelegramInbound = {
    type: 'object',
    properties: {
      update_id: { type: 'integer', example: UPDATE_ID_EXAMPLE },
      message: {
        type: 'object',
        properties: {
          message_id: { type: 'integer', example: MESSAGE_ID_EXAMPLE },
          text: { type: 'string', example: 'مرحبا' },
          from: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              username: { type: 'string' },
            },
          },
        },
      },
    },
    required: ['update_id'],
  };
}

function addWebhookPaths(doc: OpenAPIObject & AnyObj) {
  doc.webhooks = {
    whatsappMessage: {
      post: {
        summary: 'Incoming WhatsApp message',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WhatsAppInbound' },
              examples: {
                sample: {
                  value: {
                    from: '9665xxxxxxx',
                    text: 'وش عندكم؟',
                    timestamp: new Date().toISOString(),
                  },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Ack' } },
      },
    },
    telegramUpdate: {
      post: {
        summary: 'Incoming Telegram update',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TelegramInbound' },
            },
          },
        },
        responses: { '200': { description: 'Ack' } },
      },
    },
  };
}

/* ------------------------- public API functions ------------------------- */

export function buildOpenApiDoc(
  app: INestApplication,
  opts?: { prod?: boolean; version?: string },
): OpenAPIObject & AnyObj {
  const isProd = !!opts?.prod;
  const version = opts?.version ?? '1.1';

  const cfg = createSwaggerConfig(version, isProd);
  const doc = createBaseDoc(app, cfg);

  addSLOExtensions(doc);
  addWebhookSchemas(doc);
  addWebhookPaths(doc);

  return doc;
}

export function mountSwagger(
  app: INestApplication,
  document: OpenAPIObject,
  basePath = '/docs',
): void {
  const custom: SwaggerCustomOptions = {
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
    },
    customSiteTitle: 'Kaleem API Docs',
  };

  SwaggerModule.setup(basePath.replace(/^\//, ''), app, document, custom);

  const outDir = path.join(process.cwd(), 'public', 'docs');
  fs.mkdirSync(outDir, { recursive: true } as fs.MakeDirectoryOptions);
  fs.writeFileSync(
    path.join(outDir, 'openapi.json'),
    JSON.stringify(document, null, JSON_INDENT_SPACES),
  );

  try {
    const yaml = jsonToYaml(document as unknown as AnyObj);
    fs.writeFileSync(path.join(outDir, 'openapi.yaml'), yaml);
  } catch {
    // ignore YAML failure
  }

  app
    .getHttpAdapter()
    .get('/docs-json', (_req, res) =>
      (res as { json: (data: unknown) => void }).json(document),
    );
}

/* ------------------------------ YAML helper ----------------------------- */

function jsonToYaml(obj: AnyObj, indent = 0): string {
  const pad = (n: number) => '  '.repeat(n);
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj))
    return obj
      .map(
        (v) =>
          `${pad(indent)}- ${jsonToYaml(v as unknown as AnyObj, indent + 1).trimStart()}`,
      )
      .join('\n');
  return Object.entries(obj)
    .map(([k, v]) => {
      const val =
        typeof v === 'object' && v !== null
          ? `\n${jsonToYaml(v as AnyObj, indent + 1)}`
          : ` ${jsonToYaml(v as AnyObj, 0)}`;
      return `${pad(indent)}${k}:${val}`;
    })
    .join('\n');
}
