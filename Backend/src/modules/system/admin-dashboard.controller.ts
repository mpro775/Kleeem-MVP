// src/modules/system/admin-dashboard.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';

import {
  AdminDashboardService,
  DashboardStatsDto,
  DashboardTrendsDto,
  DashboardTrendsPeriod,
} from './admin-dashboard.service';

@ApiTags('Admin', 'Admin Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get()
  @ApiOperation({ summary: 'إحصائيات مجمعة للوحة الأدمن' })
  @ApiResponse({
    status: 200,
    description: 'أرقام التجار والمستخدمين والاستهلاك',
    schema: {
      type: 'object',
      properties: {
        merchants: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            activeCount: { type: 'number' },
            inactiveCount: { type: 'number' },
            byStatus: { type: 'object' },
          },
        },
        users: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            activeCount: { type: 'number' },
            inactiveCount: { type: 'number' },
            byRole: { type: 'object' },
          },
        },
        usage: {
          type: 'object',
          properties: {
            monthKey: { type: 'string' },
            totalMessagesUsed: { type: 'number' },
            merchantCount: { type: 'number' },
          },
        },
      },
    },
  })
  getStats(): Promise<DashboardStatsDto> {
    return this.dashboardService.getStats();
  }

  @Get('trends')
  @ApiOperation({
    summary: 'إحصائيات زمنية للرسم البياني (تجار، مستخدمين، استهلاك)',
  })
  @ApiResponse({
    status: 200,
    description: 'ترند يومي للتجار والمستخدمين، وترند شهري للاستهلاك',
  })
  getTrends(@Query('period') period?: string): Promise<DashboardTrendsDto> {
    const p: DashboardTrendsPeriod = period === '30d' ? '30d' : '7d';
    return this.dashboardService.getTrends(p);
  }
}
