import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RequestWithUser } from 'src/common/interfaces/request-with-user.interface';
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
} from '@nestjs/swagger';

@ApiTags('الخطط')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'إنشاء خطة اشتراك جديدة (ADMIN فقط)' })
  @ApiBody({
    type: CreatePlanDto,
    description: 'بيانات الخطة: الاسم، السعر، المدة بالأيام',
  })
  @ApiCreatedResponse({ description: 'تم إنشاء الخطة بنجاح' })
  @ApiForbiddenResponse({ description: 'ممنوع: فقط ADMIN يمكنه إنشاء الخطط' })
  @ApiBadRequestResponse({
    description: 'طلب غير صالح: بيانات مفقودة أو تنسيق خاطئ',
  })
  async create(
    @Body() createDto: CreatePlanDto,
    @Request() req: RequestWithUser,
  ) {
    const user = req.user;
    if (user.role !== 'ADMIN') {
      throw new HttpException('ممنوع', HttpStatus.FORBIDDEN);
    }
    return this.plansService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'جلب جميع الخطط المتاحة (عام)' })
  @ApiOkResponse({
    description: 'تم إرجاع قائمة الخطط بنجاح',
    type: CreatePlanDto,
    isArray: true,
  })
  async findAll() {
    return this.plansService.findAll();
  }

  @Get(':id')
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف الخطة' })
  @ApiOperation({ summary: 'جلب خطة واحدة حسب المعرّف' })
  @ApiOkResponse({
    description: 'تم إرجاع بيانات الخطة بنجاح',
    type: CreatePlanDto,
  })
  @ApiNotFoundResponse({ description: 'الخطة غير موجودة' })
  async findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف الخطة' })
  @ApiOperation({ summary: 'تحديث خطة (ADMIN فقط)' })
  @ApiBody({
    type: UpdatePlanDto,
    description: 'الحقول المراد تحديثها: الاسم، السعر، المدة',
  })
  @ApiOkResponse({ description: 'تم تحديث الخطة بنجاح' })
  @ApiForbiddenResponse({ description: 'ممنوع: فقط ADMIN يمكنه التحديث' })
  @ApiNotFoundResponse({ description: 'الخطة غير موجودة' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdatePlanDto,
    @Request() req: RequestWithUser,
  ) {
    const user = req.user;
    if (user.role !== 'ADMIN') {
      throw new HttpException('ممنوع', HttpStatus.FORBIDDEN);
    }
    return this.plansService.update(id, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiParam({ name: 'id', type: 'string', description: 'معرّف الخطة' })
  @ApiOperation({ summary: 'حذف خطة (ADMIN فقط)' })
  @ApiOkResponse({ description: 'تم حذف الخطة بنجاح' })
  @ApiForbiddenResponse({ description: 'ممنوع: فقط ADMIN يمكنه الحذف' })
  @ApiNotFoundResponse({ description: 'الخطة غير موجودة' })
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    const user = req.user;
    if (user.role !== 'ADMIN') {
      throw new HttpException('ممنوع', HttpStatus.FORBIDDEN);
    }
    return this.plansService.remove(id);
  }
}

/**
 * النواقص:
 * - يمكن إضافة أمثلة في @ApiCreatedResponse و@ApiOkResponse باستخدام schema.example.
 * - إضافة @ApiUnauthorizedResponse لتغطية حالة التوكن المفقود أو غير الصالح.
 * - توثيق دقيق لحقول CreatePlanDto وUpdatePlanDto (مثل القيم المحتملة للمدة).
 */
