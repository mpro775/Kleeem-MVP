// Global exception filters configuration
import { AllExceptionsFilter } from '../common/filters/all-exceptions.filter';

import type { INestApplication } from '@nestjs/common';

export function configureFilters(app: INestApplication): void {
  const filter = app.get(AllExceptionsFilter);
  app.useGlobalFilters(filter);
}
