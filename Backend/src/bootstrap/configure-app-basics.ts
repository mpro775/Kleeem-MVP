import { randomUUID } from 'crypto';

import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { setupApp } from '../common/config/app.config';

import type { NestExpressApplication } from '@nestjs/platform-express';

interface EnvironmentValidatorService {
  validateOrExit(): void;
  logEnvironmentSummary(): void;
}

/** شكل بسيط لما نحتاجه من crypto (بدون DOM types) */
type CryptoLike = {
  randomUUID: () => string;
};

/** يضمن وجود crypto.randomUUID بدون أيّ cast خطير */
function ensureCryptoRandomUUID(): void {
  const g = globalThis as unknown as { crypto?: Partial<CryptoLike> };

  if (typeof g.crypto?.randomUUID !== 'function') {
    g.crypto = {
      ...(g.crypto ?? {}),
      randomUUID,
    };
  }
}

export function configureAppBasics(app: NestExpressApplication): void {
  const config = app.get(ConfigService);
  setupApp(app, config);

  // بيئة ومتغيرات
  const envValidator = app.get<EnvironmentValidatorService>(
    'EnvironmentValidatorService',
  );
  envValidator.validateOrExit();
  envValidator.logEnvironmentSummary();

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });

  ensureCryptoRandomUUID();

  // تجنّب "no-magic-numbers" لو القاعدة مفعّلة عندك
  const TRUST_PROXY_HOPS = 1 as const;
  app.set('trust proxy', TRUST_PROXY_HOPS);

  app.enableShutdownHooks();
}
