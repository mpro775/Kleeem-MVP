// Logging configuration
import { Logger as PinoLogger } from 'nestjs-pino';

import type { INestApplication } from '@nestjs/common';

export function configureLogging(app: INestApplication): void {
  const logger = app.get(PinoLogger);
  app.useLogger(logger);
}
