// Logging configuration
import { INestApplication } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';

export function configureLogging(app: INestApplication): void {
  const logger = app.get(PinoLogger);
  app.useLogger(logger);
}
