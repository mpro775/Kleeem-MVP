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

import { AddTicketReplyDto } from './dto/add-ticket-reply.dto';
import { QueryAdminSupportDto } from './dto/query-admin-support.dto';
import { UpdateSupportAdminDto } from './dto/update-support-admin.dto';
import { SupportService } from './support.service';

import type { SupportTicketEntity } from './repositories/support.repository';

@ApiTags('Admin', 'Admin Support')
@ApiBearerAuth()
@Controller('admin/support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class SupportAdminController {
  constructor(private readonly service: SupportService) {}

  @Get('stats')
  @ApiOperation({ summary: 'د.3: إحصائيات التذاكر حسب الحالة' })
  @ApiResponse({ status: 200, description: 'إحصائيات التذاكر' })
  getStats(): Promise<{
    byStatus: Record<string, number>;
    total: number;
    avgResolutionHours?: number;
  }> {
    return this.service.getStatsAdmin();
  }

  @Get()
  @ApiOperation({ summary: 'قائمة تذاكر الدعم' })
  @ApiResponse({ status: 200, description: 'قائمة التذاكر مع الإجمالي' })
  list(
    @Query() q: QueryAdminSupportDto,
  ): Promise<{ items: SupportTicketEntity[]; total: number }> {
    const params = {
      limit: q.limit ?? 30,
      page: q.page ?? 1,
      ...(q.status && { status: q.status }),
      ...(q.search?.trim() && { search: q.search.trim() }),
      sortBy: q.sortBy ?? 'createdAt',
      sortOrder: q.sortOrder ?? 'desc',
    };
    return this.service.listAllAdmin(params);
  }

  @Get('export')
  @ApiOperation({ summary: 'تصدير قائمة التذاكر بصيغة CSV' })
  @ApiResponse({
    status: 200,
    description: 'ملف CSV',
    content: { 'text/csv': {} },
  })
  async export(@Query() q: QueryAdminSupportDto): Promise<StreamableFile> {
    const csv = await this.service.exportCsv({
      ...(q.status && { status: q.status }),
    });
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="support-tickets.csv"',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل تذكرة واحدة' })
  @ApiParam({ name: 'id', description: 'معرف التذكرة' })
  @ApiResponse({ status: 200, description: 'تفاصيل التذكرة' })
  @ApiResponse({ status: 404, description: 'التذكرة غير موجودة' })
  getOne(@Param('id') id: string): Promise<SupportTicketEntity> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التذكرة غير صالح');
    }
    return this.service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث حالة التذكرة أو تعيين الموظف' })
  @ApiParam({ name: 'id', description: 'معرف التذكرة' })
  @ApiBody({ type: UpdateSupportAdminDto })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  @ApiResponse({ status: 404, description: 'التذكرة غير موجودة' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSupportAdminDto,
  ): Promise<SupportTicketEntity> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التذكرة غير صالح');
    }
    return this.service.updateAdmin(id, dto);
  }

  @Post(':id/replies')
  @ApiOperation({ summary: 'د.2: إضافة رد/تعليق على تذكرة' })
  @ApiParam({ name: 'id', description: 'معرف التذكرة' })
  @ApiBody({ type: AddTicketReplyDto })
  @ApiResponse({ status: 200, description: 'تمت إضافة الرد' })
  @ApiResponse({ status: 404, description: 'التذكرة غير موجودة' })
  addReply(
    @Param('id') id: string,
    @Body() dto: AddTicketReplyDto,
    @CurrentUser() user: { userId: string },
  ): Promise<SupportTicketEntity> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف التذكرة غير صالح');
    }
    return this.service.addReplyAdmin(
      id,
      dto.body,
      user.userId,
      dto.isInternal ?? false,
    );
  }
}
