import { Module, forwardRef } from '@nestjs/common';

import { ChannelsModule } from '../../modules/channels/channels.module';

import { EnvironmentValidatorService } from './environment-validator.service';
import { PaginationService } from './pagination.service';
import { SmsService } from './sms.service';
import { TranslationService } from './translation.service';

@Module({
  imports: [forwardRef(() => ChannelsModule)],
  providers: [
    TranslationService,
    PaginationService,
    SmsService,
    {
      provide: 'EnvironmentValidatorService',
      useClass: EnvironmentValidatorService,
    },
  ],
  exports: [
    TranslationService,
    PaginationService,
    SmsService,
    'EnvironmentValidatorService',
  ],
})
export class CommonServicesModule {}
