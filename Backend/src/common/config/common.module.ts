// src/common/config/common.module.ts
import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

import {
  AllExceptionsFilter,
  WsAllExceptionsFilter,
  ResponseInterceptor,
  LoggingInterceptor,
} from '../index';
import { RedisLockService } from '../locks';
import { EnvironmentValidatorService } from '../services/environment-validator.service';
import { TranslationService } from '../services/translation.service';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [
    // Global Filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: WsAllExceptionsFilter,
    },

    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // Services
    {
      provide: 'EnvironmentValidatorService',
      useClass: EnvironmentValidatorService,
    },
    TranslationService,
    RedisLockService,

    // Global Guards (اختياري - يمكن إزالته إذا كنت تريد تطبيقه يدوياً)
    // {
    //   provide: APP_GUARD,
    //   useClass: AuthGuard,
    // },
  ],
  exports: [
    JwtModule,
    'EnvironmentValidatorService',
    TranslationService,
    RedisLockService,
  ],
})
export class CommonModule {}
