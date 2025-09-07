// src/common/error-management.module.ts
import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ErrorManagementService } from './services/error-management.service';
import { SentryService } from './services/sentry.service';
import { ErrorLoggingInterceptor } from './interceptors/error-logging.interceptor';
import { PerformanceTrackingInterceptor } from './interceptors/performance-tracking.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { ErrorMonitoringController } from './controllers/error-monitoring.controller';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    SentryService,
    ErrorManagementService,
    ErrorLoggingInterceptor,
    PerformanceTrackingInterceptor,
    AllExceptionsFilter,
  ],
  controllers: [ErrorMonitoringController],
  exports: [
    SentryService,
    ErrorManagementService,
    ErrorLoggingInterceptor,
    PerformanceTrackingInterceptor,
    AllExceptionsFilter,
  ],
})
export class ErrorManagementModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly sentryService: SentryService,
    private readonly errorManagementService: ErrorManagementService,
  ) {}

  onModuleInit() {
    // تهيئة Sentry عند بدء التطبيق
    this.sentryService.initialize();
  }

  async onModuleDestroy() {
    // إغلاق Sentry عند إيقاف التطبيق
    await this.errorManagementService.shutdown();
  }
}
