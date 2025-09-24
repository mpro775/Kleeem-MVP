// src/common/controllers/error-monitoring.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Roles } from '../decorators/roles.decorator';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ErrorManagementService } from '../services/error-management.service';
import { SentryService } from '../services/sentry.service';

@ApiTags('Error Monitoring')
@Controller('monitoring/errors')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ErrorMonitoringController {
  constructor(
    private readonly errorManagementService: ErrorManagementService,
    private readonly sentryService: SentryService,
  ) {}

  @Get('stats')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get error statistics' })
  @ApiResponse({
    status: 200,
    description: 'Error statistics retrieved successfully',
  })
  getErrorStats(
    @Query('merchantId') merchantId?: string,
    @Query('severity') severity?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): ReturnType<ErrorManagementService['getErrorStats']> {
    const filters = {
      merchantId,
      severity,
      category,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    };

    return this.errorManagementService.getErrorStats(filters);
  }

  @Get('sentry/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get Sentry status' })
  @ApiResponse({
    status: 200,
    description: 'Sentry status retrieved successfully',
  })
  getSentryStatus(): Promise<{
    enabled: boolean;
    currentUserId: string | undefined;
    timestamp: string;
  }> {
    return Promise.resolve({
      enabled: this.sentryService.isEnabled(),
      currentUserId: this.sentryService.getCurrentUserId(),
      timestamp: new Date().toISOString(),
    });
  }

  @Get('health')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get error monitoring health status' })
  @ApiResponse({
    status: 200,
    description: 'Health status retrieved successfully',
  })
  getHealthStatus(): {
    status: string;
    timestamp: string;
    services: {
      errorManagement: { status: string; totalErrors: number };
      sentry: { status: string; enabled: boolean };
    };
    summary: {
      totalErrors: number;
      bySeverity: Record<string, number>;
      byCategory: Record<string, number>;
      recentErrors: number;
    };
  } {
    const stats = this.errorManagementService.getErrorStats();

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        errorManagement: {
          status: 'active',
          totalErrors: stats.total,
        },
        sentry: {
          status: this.sentryService.isEnabled() ? 'active' : 'disabled',
          enabled: this.sentryService.isEnabled(),
        },
      },
      summary: {
        totalErrors: stats.total,
        bySeverity: stats.bySeverity,
        byCategory: stats.byCategory,
        recentErrors: stats.recentErrors.length,
      },
    };
  }
}
