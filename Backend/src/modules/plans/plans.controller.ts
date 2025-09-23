// plans.controller.ts
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

@ApiTags('الخطط')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء خطة اشتراك جديدة (ADMIN فقط)' })
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
        items: [
          {
            _id: '...',
            name: 'Pro',
            priceCents: 100,
            currency: 'USD',
            durationDays: 30,
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        pages: 1,
      },
    },
  })
  findAll(
    @Query() q: QueryPlansDto,
  ): Promise<{ items: PlanEntity[]; total: number }> {
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOperation({ summary: 'تحديث خطة (ADMIN فقط)' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string' })
  @ApiOperation({ summary: 'حذف خطة (ADMIN فقط)' })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'تفعيل/تعطيل خطة' })
  setActive(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body('isActive') isActive: boolean,
  ): Promise<PlanEntity | null> {
    return this.plansService.toggleActive(id, isActive);
  }

  @Patch(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'أرشفة خطة (soft delete)' })
  archive(
    @Param('id', ParseObjectIdPipe) id: string,
  ): Promise<PlanEntity | null> {
    return this.plansService.archive(id);
  }
}
