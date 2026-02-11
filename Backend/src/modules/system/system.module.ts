import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RedisModule } from '@nestjs-modules/ioredis';

import { CacheModule } from '../../common/cache/cache.module';
import { AuthModule } from '../auth/auth.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ChannelsModule } from '../channels/channels.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { MessagingModule } from '../messaging/message.module';
import { PlansModule } from '../plans/plans.module';
import { UsageModule } from '../usage/usage.module';
import { UsersModule } from '../users/users.module';

import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminReportsController } from './admin-reports.controller';
import { AdminReportsService } from './admin-reports.service';
import { AdminSystemController } from './admin-system.controller';
import { HealthController } from './health.controller';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminSystemService } from './services/admin-system.service';
import { FeatureFlagsService } from './services/feature-flags.service';
import { AdminAuditLog, AdminAuditLogSchema } from './schemas/admin-audit-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminAuditLog.name, schema: AdminAuditLogSchema },
    ]),
    CacheModule,
    AuthModule,
    MerchantsModule,
    UsersModule,
    UsageModule,
    MessagingModule,
    ChannelsModule,
    PlansModule,
    AnalyticsModule,
    RedisModule.forRootAsync({
      useFactory: () => ({
        type: 'single',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      }),
    }),
  ],
  controllers: [
    HealthController,
    AdminDashboardController,
    AdminReportsController,
    AdminSystemController,
  ],
  providers: [
    AdminDashboardService,
    AdminReportsService,
    AdminAuditService,
    AdminSystemService,
    FeatureFlagsService,
  ],
  exports: [AdminAuditService, FeatureFlagsService],
})
export class SystemModule {}
