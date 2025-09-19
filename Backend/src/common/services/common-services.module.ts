import { Module } from '@nestjs/common';
import { TranslationService } from './translation.service';
import { PaginationService } from './pagination.service';
import { EnvironmentValidatorService } from './environment-validator.service';

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
