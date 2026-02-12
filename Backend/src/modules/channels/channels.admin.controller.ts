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
import { HydratedDocument } from 'mongoose';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';
import { ChannelLean } from '../webhooks/repositories/channel.repository';

import { ChannelsService } from './channels.service';
import { QueryAdminChannelsDto } from './dto/query-admin-channels.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { StatsAdminResult } from './repositories/channels.repository';
import {
  Channel,
  ChannelProvider,
  ChannelStatus,
} from './schemas/channel.schema';

@ApiTags('Admin', 'Admin Channels')
@ApiBearerAuth()
@Controller('admin/channels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ChannelsAdminController {
  constructor(private readonly service: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة القنوات لجميع التجار' })
  @ApiResponse({ status: 200, description: 'قائمة القنوات مع الإجمالي' })
  list(
    @Query() q: QueryAdminChannelsDto,
  ): Promise<{ items: ChannelLean[]; total: number }> {
    const params: {
      merchantId?: string;
      provider?: ChannelProvider;
      status?: ChannelStatus;
      limit: number;
      page: number;
    } = {
      limit: q.limit ?? 30,
      page: q.page ?? 1,
    };
    if (q.merchantId) params.merchantId = q.merchantId;
    if (q.provider) params.provider = q.provider;
    if (q.status) params.status = q.status;
    return this.service.listAllAdmin(params);
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات القنوات على مستوى النظام' })
  @ApiResponse({ status: 200, description: 'إحصائيات حسب المزود والحالة' })
  getStats(): Promise<StatsAdminResult> {
    return this.service.getStatsAdmin();
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل قناة واحدة' })
  @ApiParam({ name: 'id', description: 'معرف القناة' })
  @ApiResponse({ status: 200, description: 'تفاصيل القناة' })
  @ApiResponse({ status: 404, description: 'القناة غير موجودة' })
  get(@Param('id') id: string): Promise<HydratedDocument<Channel>> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف القناة غير صالح');
    }
    return this.service.get(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث قناة' })
  @ApiParam({ name: 'id', description: 'معرف القناة' })
  @ApiBody({ type: UpdateChannelDto })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  @ApiResponse({ status: 404, description: 'القناة غير موجودة' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ): Promise<HydratedDocument<Channel>> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف القناة غير صالح');
    }
    return this.service.update(id, dto);
  }

  @Post(':id/actions/disconnect')
  @ApiOperation({ summary: 'فصل القناة عن المزود' })
  @ApiParam({ name: 'id', description: 'معرف القناة' })
  @ApiResponse({ status: 200, description: 'تم فصل القناة' })
  @ApiResponse({ status: 404, description: 'القناة غير موجودة' })
  disconnect(
    @Param('id') id: string,
  ): Promise<{ deleted: boolean } | { ok: boolean }> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف القناة غير صالح');
    }
    return this.service.remove(id, 'disconnect');
  }
}
