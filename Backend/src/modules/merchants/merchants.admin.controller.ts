import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
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
  ApiBody,
} from '@nestjs/swagger';
import { Types } from 'mongoose';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';

import { QueryAdminMerchantsDto } from './dto/query-admin-merchants.dto';
import { SuspendMerchantDto } from './dto/suspend-merchant.dto';
import { UpdateMerchantAdminDto } from './dto/update-merchant-admin.dto';
import { MerchantsService } from './merchants.service';
import { MerchantDocument } from './schemas/merchant.schema';

import type {
  MerchantAdminLean,
  StatsAdminResult,
} from './repositories/merchants.repository';

@ApiTags('Admin', 'Admin Merchants')
@ApiBearerAuth()
@Controller('admin/merchants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MerchantsAdminController {
  constructor(private readonly service: MerchantsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة التجار لجميع المنصة' })
  @ApiResponse({ status: 200, description: 'قائمة التجار مع الإجمالي' })
  list(
    @Query() q: QueryAdminMerchantsDto,
  ): Promise<{ items: MerchantAdminLean[]; total: number }> {
    const params = {
      limit: q.limit ?? 30,
      page: q.page ?? 1,
      ...(q.status && { status: q.status }),
      ...(typeof q.active === 'boolean' && { active: q.active }),
      ...(q.includeDeleted && { includeDeleted: true }),
      ...(q.search?.trim() && { search: q.search.trim() }),
      sortBy: q.sortBy ?? 'createdAt',
      sortOrder: q.sortOrder ?? 'desc',
      ...(q.subscriptionTier && { subscriptionTier: q.subscriptionTier }),
    };
    return this.service.listAllAdmin(params);
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات التجار على مستوى المنصة' })
  @ApiResponse({ status: 200, description: 'إحصائيات حسب الحالة والتفعيل' })
  getStats(): Promise<StatsAdminResult> {
    return this.service.getStatsAdmin();
  }

  @Get('export')
  @ApiOperation({ summary: 'تصدير قائمة التجار بصيغة CSV' })
  @ApiResponse({
    status: 200,
    description: 'ملف CSV',
    content: { 'text/csv': {} },
  })
  async export(@Query() q: QueryAdminMerchantsDto): Promise<StreamableFile> {
    const csv = await this.service.exportCsv({
      ...(q.status && { status: q.status }),
      ...(typeof q.active === 'boolean' && { active: q.active }),
      ...(q.includeDeleted && { includeDeleted: true }),
      ...(q.subscriptionTier && { subscriptionTier: q.subscriptionTier }),
    });
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="merchants.csv"',
    });
  }

  @Get(':id/audit-log')
  @ApiOperation({ summary: 'سجل إجراءات تاجر (أدمن)' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiResponse({ status: 200, description: 'سجل الإجراءات' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  getAuditLog(
    @Param('id') id: string,
    @Query('limit') limit?: number,
    @Query('page') page?: number,
  ): ReturnType<MerchantsService['getAuditLog']> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    const parsedLimit = limit != null ? Number(limit) : undefined;
    const parsedPage = page != null ? Number(page) : undefined;
    return this.service.getAuditLog(id, parsedLimit, parsedPage);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل تاجر واحد' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiResponse({ status: 200, description: 'تفاصيل التاجر' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  getOne(@Param('id') id: string): Promise<MerchantDocument> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث حالة التاجر (تفعيل/حالة)' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: UpdateMerchantAdminDto })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMerchantAdminDto,
  ): Promise<MerchantDocument> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    return this.service.updateAdmin(id, dto);
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'تعليق تاجر مع سبب (أدمن)' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiBody({ type: SuspendMerchantDto })
  @ApiResponse({ status: 200, description: 'تم التعليق' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  suspend(
    @Param('id') id: string,
    @Body() dto: SuspendMerchantDto,
    @CurrentUser() user: { userId: string },
  ): Promise<MerchantDocument> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    return this.service.suspend(id, user, dto?.reason);
  }

  @Post(':id/unsuspend')
  @ApiOperation({ summary: 'إعادة تفعيل تاجر معلّق (أدمن)' })
  @ApiParam({ name: 'id', description: 'معرف التاجر' })
  @ApiResponse({ status: 200, description: 'تم إعادة التفعيل' })
  @ApiResponse({ status: 404, description: 'التاجر غير موجود' })
  unsuspend(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ): Promise<MerchantDocument> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التاجر غير صالح');
    }
    return this.service.unsuspend(id, user);
  }
}
