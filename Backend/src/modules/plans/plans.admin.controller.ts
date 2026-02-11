// plans.admin.controller.ts — مسارات إدارة الخطط تحت بادئة admin
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { UserRole } from '../users/schemas/user.schema';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ParseObjectIdPipe } from '../../common/pipes/parse-objectid.pipe';

import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';
import { PlanEntity } from './repositories/plan.repository';
import { Plan } from './schemas/plan.schema';

@ApiTags('Admin', 'Admin Plans')
@ApiBearerAuth()
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class PlansAdminController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء خطة اشتراك جديدة' })
  @ApiBody({ type: CreatePlanDto })
  @ApiCreatedResponse({
    description: 'تم إنشاء الخطة',
    schema: {
      example: {
        _id: '...',
        name: 'Pro Monthly',
        priceCents: 100,
        currency: 'USD',
        durationDays: 30,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  create(@Body() dto: CreatePlanDto): Promise<PlanEntity> {
    return this.plansService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة الخطط مع ترقيم/فرز/فلترة' })
  @ApiOkResponse({
    description: 'قائمة الخطط',
    schema: {
      example: {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        pages: 0,
      },
    },
  })
  findAll(
    @Query() q: QueryPlansDto,
  ): Promise<{
    items: PlanEntity[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    return this.plansService.findAllPaged(q);
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOperation({ summary: 'جلب خطة حسب المعرّف' })
  @ApiOkResponse({ description: 'تم الإرجاع' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  findOne(@Param('id', ParseObjectIdPipe) id: string): Promise<Plan> {
    return this.plansService.findOne(id);
  }

  @Put(':id')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOperation({ summary: 'تحديث خطة' })
  @ApiBody({ type: UpdatePlanDto })
  @ApiOkResponse({ description: 'تم التحديث' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<Plan> {
    return this.plansService.update(id, dto);
  }

  @Delete(':id')
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOperation({ summary: 'حذف خطة' })
  @ApiOkResponse({ description: 'تم الحذف' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Insufficient role' })
  @ApiNotFoundResponse({ description: 'Plan not found' })
  remove(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<{ message: string }> {
    return this.plansService.remove(id);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'تفعيل/تعطيل خطة' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiBody({ schema: { type: 'object', properties: { isActive: { type: 'boolean' } } } })
  @ApiOkResponse({ description: 'تم التحديث' })
  setActive(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<PlanEntity | null> {
    return this.plansService.toggleActive(id, isActive);
  }

  @Patch(':id/archive')
  @ApiOperation({ summary: 'أرشفة خطة (soft delete)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOkResponse({ description: 'تم الأرشفة' })
  archive(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<PlanEntity | null> {
    return this.plansService.archive(id);
  }
}
