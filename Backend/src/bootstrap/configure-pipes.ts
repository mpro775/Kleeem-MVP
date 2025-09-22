// Global pipes configuration
import { ValidationPipe } from '@nestjs/common';

import type { INestApplication } from '@nestjs/common';

export function configurePipes(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      forbidNonWhitelisted: false,
    }),
  );
}
