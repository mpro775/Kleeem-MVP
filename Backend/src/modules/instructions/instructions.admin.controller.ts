import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  NotFoundException,
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

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '../users/schemas/user.schema';

import { BulkIdsDto } from './dto/bulk-ids.dto';
import { QueryAdminInstructionsDto } from './dto/query-admin-instructions.dto';
import { InstructionsService } from './instructions.service';
import { Instruction } from './schemas/instruction.schema';

@ApiTags('Admin', 'Admin Instructions')
@ApiBearerAuth()
@Controller('admin/instructions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class InstructionsAdminController {
  constructor(private readonly service: InstructionsService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة التوجيهات لجميع التجار' })
  @ApiResponse({ status: 200, description: 'قائمة التوجيهات مع الإجمالي' })
  async list(@Query() q: QueryAdminInstructionsDto): Promise<{
    items: Array<Instruction & { _id: Types.ObjectId }>;
    total: number;
  }> {
    const params: {
      merchantId?: string;
      active?: boolean;
      type?: 'auto' | 'manual';
      limit: number;
      page: number;
    } = {
      limit: q.limit ?? 30,
      page: q.page ?? 1,
    };
    if (q.merchantId) params.merchantId = q.merchantId;
    if (q.active === 'true' || q.active === 'false') {
      params.active = q.active === 'true';
    }
    if (q.type) params.type = q.type;
    return this.service.findAll(params);
  }

  @Post('bulk-activate')
  @ApiOperation({ summary: 'تفعيل توجيهات بالجملة' })
  @ApiBody({ type: BulkIdsDto })
  @ApiResponse({ status: 200, description: 'عدد التوجيهات المُفعّلة' })
  async bulkActivate(@Body() dto: BulkIdsDto): Promise<{ updated: number }> {
    let updated = 0;
    for (const id of dto.ids) {
      const result = await this.service.activate(id);
      if (result) updated += 1;
    }
    return { updated };
  }

  @Post('bulk-deactivate')
  @ApiOperation({ summary: 'إلغاء تفعيل توجيهات بالجملة' })
  @ApiBody({ type: BulkIdsDto })
  @ApiResponse({ status: 200, description: 'عدد التوجيهات المُلغى تفعيلها' })
  async bulkDeactivate(@Body() dto: BulkIdsDto): Promise<{ updated: number }> {
    let updated = 0;
    for (const id of dto.ids) {
      const result = await this.service.deactivate(id);
      if (result) updated += 1;
    }
    return { updated };
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل توجيه واحد' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiResponse({ status: 200, description: 'التوجيه' })
  @ApiResponse({ status: 404, description: 'التوجيه غير موجود' })
  async getOne(
    @Param('id') id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    const instruction = await this.service.findOne(id);
    if (!instruction) {
      throw new NotFoundException('التوجيه غير موجود');
    }
    return instruction;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instruction: { type: 'string' },
        active: { type: 'boolean' },
        relatedReplies: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'تم التحديث' })
  async update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      instruction: string;
      active: boolean;
      relatedReplies: string[];
    }>,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    const existing = await this.service.findOne(id);
    if (!existing) {
      throw new NotFoundException('التوجيه غير موجود');
    }
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiResponse({ status: 200, description: 'تم الحذف' })
  async remove(
    @Param('id') id: string,
  ): Promise<(Instruction & { _id: Types.ObjectId }) | null> {
    const existing = await this.service.findOne(id);
    if (!existing) {
      throw new NotFoundException('التوجيه غير موجود');
    }
    return this.service.remove(id);
  }
}
