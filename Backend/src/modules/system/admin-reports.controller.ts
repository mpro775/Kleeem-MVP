// src/modules/system/admin-reports.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';

import { AdminReportsService } from './admin-reports.service';

@ApiTags('Admin', 'Admin Reports')
@ApiBearerAuth()
@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminReportsController {
  constructor(private readonly reportsService: AdminReportsService) {}

  @Get('merchant-activity/:merchantId')
  @ApiOperation({ summary: 'و.1: تقرير نشاط تاجر' })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر' })
  @ApiResponse({
    status: 200,
    description: 'آخر نشاط، عدد المحادثات، القنوات',
    schema: {
      type: 'object',
      properties: {
        merchantId: { type: 'string' },
        merchantName: { type: 'string' },
        lastActivity: { type: 'string', format: 'date-time' },
        conversationCount: { type: 'number' },
        channelsTotal: { type: 'number' },
        channelsEnabled: { type: 'number' },
        channelsConnected: { type: 'number' },
      },
    },
  })
  getMerchantActivity(
    @Param('merchantId') merchantId: string,
  ): ReturnType<AdminReportsService['getMerchantActivity']> {
    return this.reportsService.getMerchantActivity(merchantId);
  }

  @Get('signups')
  @ApiOperation({ summary: 'و.2: تقرير التحويلات/التسجيل' })
  @ApiQuery({
    name: 'from',
    description: 'من تاريخ YYYY-MM-DD',
    required: true,
  })
  @ApiQuery({ name: 'to', description: 'إلى تاريخ YYYY-MM-DD', required: true })
  @ApiResponse({
    status: 200,
    description: 'تسجيلات التجار والمستخدمين حسب الفترة',
  })
  getSignupsReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ): ReturnType<AdminReportsService['getSignupsReport']> {
    return this.reportsService.getSignupsReport({ from, to });
  }

  @Get('kleem-summary')
  @ApiOperation({ summary: 'و.3: ملخص تحليلات كليم' })
  @ApiResponse({
    status: 200,
    description: 'عدد الردود المفقودة (مفتوحة/محلولة)',
    schema: {
      type: 'object',
      properties: {
        missingOpen: { type: 'number' },
        missingResolved: { type: 'number' },
        missingTotal: { type: 'number' },
      },
    },
  })
  getKleemSummary(): ReturnType<AdminReportsService['getKleemSummary']> {
    return this.reportsService.getKleemSummary();
  }

  @Get('usage-by-plan')
  @ApiOperation({ summary: 'و.4: تقرير الاستخدام حسب الخطة' })
  @ApiQuery({
    name: 'monthKey',
    description: 'YYYY-MM (اختياري، افتراضي الشهر الحالي)',
  })
  @ApiResponse({
    status: 200,
    description: 'توزيع التجار على الخطط واستهلاك كل خطة',
  })
  getUsageByPlan(
    @Query('monthKey') monthKey?: string,
  ): ReturnType<AdminReportsService['getUsageByPlan']> {
    return this.reportsService.getUsageByPlan(monthKey);
  }
}
