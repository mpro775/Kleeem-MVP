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

import { UserRole } from './schemas/user.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { AuthService } from '../auth/auth.service';
import { UsersService } from './users.service';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { UpdateUserAdminDto } from './dto/update-user-admin.dto';
import type { UserLean } from './types';
import type { UserDocument } from './schemas/user.schema';
import type {
  UserAdminLean,
  StatsAdminResult,
} from './repositories/users.repository';

@ApiTags('Admin', 'Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersAdminController {
  constructor(
    private readonly service: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'قائمة المستخدمين لجميع المنصة' })
  @ApiResponse({ status: 200, description: 'قائمة المستخدمين مع الإجمالي' })
  list(
    @Query() q: QueryAdminUsersDto,
  ): Promise<{ items: UserAdminLean[]; total: number }> {
    const params = {
      limit: q.limit ?? 30,
      page: q.page ?? 1,
      ...(q.role && { role: q.role }),
      ...(typeof q.active === 'boolean' && { active: q.active }),
      ...(q.includeDeleted && { includeDeleted: true }),
      ...(q.search?.trim() && { search: q.search.trim() }),
      sortBy: q.sortBy ?? 'createdAt',
      sortOrder: q.sortOrder ?? 'desc',
    };
    return this.service.listAllAdmin(params);
  }

  @Get('stats')
  @ApiOperation({ summary: 'إحصائيات المستخدمين على مستوى المنصة' })
  @ApiResponse({ status: 200, description: 'إحصائيات حسب الدور والتفعيل' })
  getStats(): Promise<StatsAdminResult> {
    return this.service.getStatsAdmin();
  }

  @Get('export')
  @ApiOperation({ summary: 'تصدير قائمة المستخدمين بصيغة CSV' })
  @ApiResponse({ status: 200, description: 'ملف CSV', content: { 'text/csv': {} } })
  async export(@Query() q: QueryAdminUsersDto): Promise<StreamableFile> {
    const csv = await this.service.exportCsv({
      ...(q.role && { role: q.role }),
      ...(typeof q.active === 'boolean' && { active: q.active }),
      ...(q.includeDeleted && { includeDeleted: true }),
    });
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv; charset=utf-8',
      disposition: 'attachment; filename="users.csv"',
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل مستخدم واحد' })
  @ApiParam({ name: 'id', description: 'معرف المستخدم' })
  @ApiResponse({ status: 200, description: 'تفاصيل المستخدم' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  getOne(@Param('id') id: string): Promise<UserLean> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف المستخدم غير صالح');
    }
    return this.service.findOne(id);
  }

  @Post(':id/reset-password')
  @ApiOperation({ summary: 'إعادة تعيين كلمة مرور مستخدم (أدمن)' })
  @ApiParam({ name: 'id', description: 'معرف المستخدم' })
  @ApiResponse({ status: 200, description: 'كلمة مرور مؤقتة مُرجعة' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  resetPassword(@Param('id') id: string): Promise<{ temporaryPassword: string }> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف المستخدم غير صالح');
    }
    return this.authService.adminResetPassword(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث دور أو حالة المستخدم أو ربطه بتاجر' })
  @ApiParam({ name: 'id', description: 'معرف المستخدم' })
  @ApiBody({ type: UpdateUserAdminDto })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  @ApiResponse({ status: 404, description: 'المستخدم غير موجود' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserAdminDto,
    @CurrentUser() user: { userId: string },
  ): Promise<UserDocument> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('معرف المستخدم غير صالح');
    }
    return this.service.updateAdmin(id, dto, user);
  }
}
