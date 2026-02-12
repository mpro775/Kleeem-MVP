import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Types } from 'mongoose';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MerchantAuditService } from '../merchants/services/merchant-audit.service';
import { UserRole } from '../users/schemas/user.schema';

import { QueryAdminUsageDto } from './dto/query-admin-usage.dto';
import { UsageService } from './usage.service';

@ApiTags('Admin', 'Admin Usage')
@ApiBearerAuth()
@Controller('admin/usage')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsageAdminController {
  constructor(
    private readonly usageService: UsageService,
    private readonly auditService: MerchantAuditService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'قائمة استهلاك الرسائل لجميع التجار (مع الحد ونسبة الاستهلاك)',
  })
  @ApiResponse({
    status: 200,
    description: 'قائمة الاستهلاك مع الحد ونسبة الاستهلاك',
  })
  list(@Query() q: QueryAdminUsageDto): Promise<{
    items: Array<{
      merchantId: Types.ObjectId | string;
      merchantName?: string;
      monthKey: string;
      messagesUsed: number;
      messageLimit: number;
      usagePercent: number | null;
      isUnlimited: boolean;
    }>;
    total: number;
  }> {
    const params = {
      monthKey: q.monthKey,
      limit: q.limit ?? 30,
      page: q.page ?? 1,
      sortBy: q.sortBy ?? 'messagesUsed',
      sortOrder: q.sortOrder ?? 'desc',
    };
    return this.usageService.listAllAdminWithLimits(params);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'تنبيهات تجار تجاوزوا الحد أو قاربوه' })
  @ApiResponse({
    status: 200,
    description: 'قائمة التجار المتجاوزين أو القاربيين للحد',
  })
  getAlerts(
    @Query('monthKey') monthKey?: string,
    @Query('thresholdPercent') thresholdPercent?: number,
    @Query('limit') limit?: number,
  ): ReturnType<UsageService['getAlertsAdmin']> {
    return this.usageService.getAlertsAdmin({
      monthKey: monthKey || undefined,
      thresholdPercent:
        thresholdPercent != null ? Number(thresholdPercent) : undefined,
      limit: limit != null ? Number(limit) : undefined,
    });
  }

  @Get('report')
  @ApiOperation({ summary: 'تقرير استهلاك لفترة مخصصة' })
  @ApiResponse({ status: 200, description: 'استهلاك حسب الأشهر' })
  getReport(
    @Query('from') from: string,
    @Query('to') to: string,
  ): ReturnType<UsageService['getReportAdmin']> {
    const fromKey = from?.match(/^\d{4}-(0[1-9]|1[0-2])$/) ? from : undefined;
    const toKey = to?.match(/^\d{4}-(0[1-9]|1[0-2])$/) ? to : undefined;
    if (!fromKey || !toKey) {
      throw new BadRequestException('from و to يجب أن يكونا بصيغة YYYY-MM');
    }
    return this.usageService.getReportAdmin({ from: fromKey, to: toKey });
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات الاستهلاك الشهري' })
  @ApiResponse({
    status: 200,
    description: 'إجمالي الرسائل وعدد التجار المستهلكين',
  })
  getStats(@Query('monthKey') monthKey?: string): Promise<{
    monthKey: string;
    totalMessagesUsed: number;
    merchantCount: number;
  }> {
    return this.usageService.getStatsAdmin(monthKey);
  }

  @Get('export')
  @ApiOperation({ summary: 'تصدير قائمة الاستهلاك بصيغة CSV' })
  @ApiResponse({
    status: 200,
    description: 'ملف CSV',
    content: { 'text/csv': {} },
  })
  async export(@Query('monthKey') monthKey?: string): Promise<StreamableFile> {
    const csv = await this.usageService.exportCsv({
      ...(monthKey && { monthKey }),
    });
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="usage.csv"',
    });
  }

  @Post(':merchantId/reset')
  @ApiOperation({ summary: 'إعادة تعيين استهلاك شهر معيّن لتاجر (أدمن)' })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر' })
  @ApiResponse({ status: 200, description: 'تم إعادة التعيين' })
  async resetUsage(
    @Param('merchantId') merchantId: string,
    @Query('monthKey') monthKey: string,
    @CurrentUser() user: { userId: string },
  ): Promise<{
    merchantId: Types.ObjectId | string;
    monthKey: string;
    messagesUsed: number;
  }> {
    if (!merchantId || !Types.ObjectId.isValid(merchantId)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    const key = monthKey?.match(/^\d{4}-(0[1-9]|1[0-2])$/)
      ? monthKey
      : this.usageService.monthKeyFrom();
    const before = await this.usageService.getUsage(merchantId, key);
    const result = await this.usageService.resetUsage(merchantId, key);
    if ((before.messagesUsed ?? 0) > 0) {
      await this.auditService
        .log(merchantId, 'usage_reset', user.userId, {
          metadata: { monthKey: key, previousCount: before.messagesUsed },
        })
        .catch(() => {});
    }
    return result;
  }

  @Get(':merchantId')
  @ApiOperation({ summary: 'تفاصيل استهلاك تاجر معيّن' })
  @ApiParam({ name: 'merchantId', description: 'معرف التاجر' })
  @ApiResponse({ status: 200, description: 'الاستهلاك للتاجر في الشهر' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  getUsage(
    @Param('merchantId') merchantId: string,
    @Query('monthKey') monthKey?: string,
  ): Promise<{
    merchantId: Types.ObjectId | string;
    monthKey: string;
    messagesUsed: number;
  }> {
    if (!merchantId || !Types.ObjectId.isValid(merchantId)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    return this.usageService.getUsage(merchantId, monthKey);
  }
}
