// Global exception filters configuration
import { INestApplication } from '@nestjs/common';
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

export function configureFilters(app: INestApplication): void {
  const filter = app.get(AllExceptionsFilter);
  app.useGlobalFilters(filter);
}
