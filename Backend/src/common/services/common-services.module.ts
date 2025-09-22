import { Module } from '@nestjs/common';

import { EnvironmentValidatorService } from './environment-validator.service';
import { PaginationService } from './pagination.service';
import { TranslationService } from './translation.service';

@Module({
  providers: [
    TranslationService,
    PaginationService,
    {
      provide: 'EnvironmentValidatorService',
      useClass: EnvironmentValidatorService,
    },
  ],
  exports: [
    TranslationService,
    PaginationService,
    'EnvironmentValidatorService',
  ],
})
export class CommonServicesModule {}
