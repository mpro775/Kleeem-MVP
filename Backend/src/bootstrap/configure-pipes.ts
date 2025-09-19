// Global pipes configuration
import { INestApplication, ValidationPipe } from '@nestjs/common';

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
