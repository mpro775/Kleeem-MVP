// Logging configuration
import { Logger as PinoLogger } from 'nestjs-pino';

import type { INestApplication } from '@nestjs/common';

export function configureLogging(app: INestApplication): void {
  const anyApp = app as unknown as {
    get?: (token: unknown) => unknown;
    useLogger?: (logger: unknown) => void;
  };

  const hasGet = typeof anyApp?.get === 'function';
  const hasUseLogger = typeof anyApp?.useLogger === 'function';
  if (!hasGet || !hasUseLogger) {
    // يلبي: should handle app without required methods gracefully
    return;
  }

  // لا نغلّف بـ try/catch: لو get أو useLogger ترمي، نتركها تمر حسب الاختبارات الأخرى
  const logger = anyApp.get!(PinoLogger);
  anyApp.useLogger!(logger);
}
