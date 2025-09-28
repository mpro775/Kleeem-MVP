// src/common/error-management.module.ts
import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ErrorMonitoringController } from './controllers/error-monitoring.controller';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { ErrorManagementService } from './services/error-management.service';
import { SentryService } from './services/sentry.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SentryService,
    ErrorManagementService,
    ErrorLoggingInterceptor,
    AllExceptionsFilter,
  ],
  controllers: [ErrorMonitoringController],
  exports: [
    SentryService,
    ErrorManagementService,
    ErrorLoggingInterceptor,
    AllExceptionsFilter,
  ],
})
export class ErrorManagementModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly sentryService: SentryService,
    private readonly errorManagementService: ErrorManagementService,
  ) {}

  onModuleInit(): void {
    // تهيئة Sentry عند بدء التطبيق
    this.sentryService.initialize();
  }

  onModuleDestroy(): void {
    // إغلاق Sentry عند إيقاف التطبيق
    this.errorManagementService.shutdown();
  }
}
