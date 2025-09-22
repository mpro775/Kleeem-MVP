import { randomUUID } from 'crypto';

import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { setupApp } from '../common/config/app.config';

import type { NestExpressApplication } from '@nestjs/platform-express';

export function configureAppBasics(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  setupApp(app, config);

  // بيئة ومتغيرات
  const envValidator = app.get('EnvironmentValidatorService');
  envValidator.validateOrExit();
  envValidator.logEnvironmentSummary();

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  if (typeof globalThis.crypto === 'undefined') {
    (globalThis as any).crypto = { randomUUID };
  }

  app.set('trust proxy', 1);
  app.enableShutdownHooks();
}
