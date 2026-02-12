// src/modules/system/admin-system.controller.ts
import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AdminAuditService,
  AdminAuditEntry,
  ListAdminAuditParams,
} from '../system/services/admin-audit.service';
import { AdminSystemService } from '../system/services/admin-system.service';
import { UserRole } from '../users/schemas/user.schema';

import { QueryAdminAuditDto } from './dto/query-admin-audit.dto';
import {
  FeatureFlagsService,
  FeatureFlagsDto,
} from './services/feature-flags.service';

@ApiTags('Admin', 'Admin System')
@ApiBearerAuth()
@Controller('admin/system')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminSystemController {
  constructor(
    private readonly auditService: AdminAuditService,
    private readonly featureFlags: FeatureFlagsService,
    private readonly systemService: AdminSystemService,
  ) {}

  @Get('audit-log')
  @ApiOperation({ summary: 'هـ.1: سجل تدقيق أدمن' })
  @ApiResponse({ status: 200, description: 'قائمة سجلات تدقيق الأدمن' })
  getAuditLog(
    @Query() q: QueryAdminAuditDto,
  ): Promise<{ items: AdminAuditEntry[]; total: number }> {
    const params: ListAdminAuditParams = {
      limit: q.limit,
      page: q.page,
    };

    if (q.actorId !== undefined) {
      params.actorId = q.actorId;
    }
    if (q.resource !== undefined) {
      params.resource = q.resource;
    }
    if (q.from !== undefined) {
      params.from = q.from;
    }
    if (q.to !== undefined) {
      params.to = q.to;
    }

    return this.auditService.list(params);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'هـ.2: قائمة جلسات الأدمن النشطة' })
  @ApiQuery({ name: 'adminId', required: false, description: 'فلترة حسب أدمن' })
  @ApiResponse({
    status: 200,
    description: 'جلسات أدمن مع jti، آخر استخدام، إلخ',
  })
  async getAdminSessions(@Query('adminId') adminId?: string): Promise<{
    sessions: Array<{
      jti: string;
      userId: string;
      role: string;
      lastUsed: number;
      createdAt: number;
      userAgent?: string;
      ip?: string;
      email?: string;
      name?: string;
    }>;
  }> {
    return this.systemService.listAdminSessions(adminId);
  }

  @Delete('sessions/:jti')
  @ApiOperation({ summary: 'هـ.2: إلغاء جلسة أدمن' })
  @ApiParam({ name: 'jti', description: 'معرف الجلسة' })
  @ApiResponse({ status: 200, description: 'تم إلغاء الجلسة' })
  @ApiResponse({ status: 404, description: 'الجلسة غير موجودة' })
  async revokeSession(@Param('jti') jti: string): Promise<{ message: string }> {
    const ok = await this.systemService.revokeSessionByJti(jti);
    if (!ok) throw new NotFoundException('الجلسة غير موجودة أو منتهية');
    return { message: 'تم إلغاء الجلسة' };
  }

  @Get('feature-flags')
  @ApiOperation({ summary: 'هـ.3: إعدادات قفل/فتح واجهات حساسة' })
  @ApiResponse({ status: 200, description: 'حالة feature flags' })
  getFeatureFlags(): FeatureFlagsDto {
    return this.featureFlags.getFlags();
  }

  @Post('backup')
  @ApiOperation({ summary: 'هـ.4: تفعيل نسخ احتياطي (إن وُجدت آلية)' })
  @ApiResponse({ status: 200, description: 'تم استدعاء النسخ الاحتياطي' })
  @ApiResponse({ status: 503, description: 'آلية النسخ الاحتياطي غير مُفعّلة' })
  async triggerBackup(
    @CurrentUser() user: { userId: string },
  ): Promise<{ message: string }> {
    const result = await this.systemService.triggerBackup(user.userId);
    if (!result.success) {
      throw new ServiceUnavailableException(
        result.message ?? 'آلية النسخ الاحتياطي غير مُفعّلة',
      );
    }
    return { message: result.message ?? 'تم استدعاء النسخ الاحتياطي' };
  }
}
