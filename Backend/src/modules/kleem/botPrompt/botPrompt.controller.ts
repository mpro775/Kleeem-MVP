import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { BotPromptService } from './botPrompt.service';
import { CreateBotPromptDto } from './dto/create-botPrompt.dto';
import { UpdateBotPromptDto } from './dto/update-botPrompt.dto';
import { SetActiveDto } from './dto/set-active.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { BotPrompt } from './schemas/botPrompt.schema';
@ApiTags('كليم - إدارة البرومبتات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/kleem/bot-prompts')
export class BotPromptController {
  constructor(private readonly svc: BotPromptService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'إنشاء برومبت جديد',
    description: 'إنشاء برومبت جديد مع المحتوى المحدد'
  })
  @ApiBody({ type: CreateBotPromptDto })
  @ApiCreatedResponse({
    description: 'تم إنشاء البرومبت بنجاح',
    type: BotPrompt,
  })
  @ApiBadRequestResponse({
    description: 'بيانات الطلب غير صالحة',
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async create(@Body() dto: CreateBotPromptDto) {
    return this.svc.create(dto);
  }

  @Get('ping')
  @Public()
  @ApiOperation({
    summary: 'فحص حالة الخدمة',
    description: 'فحص ما إذا كانت خدمة البرومبتات تعمل بشكل صحيح'
  })
  @ApiOkResponse({
    description: 'الخدمة تعمل بشكل صحيح',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        who: { type: 'string', example: 'bot-prompts' }
      }
    }
  })
  ping() {
    return { ok: true, who: 'bot-prompts' };
  }

  @Get()
  @ApiOperation({
    summary: 'عرض قائمة البرومبتات',
    description: 'استرجاع قائمة البرومبتات مع إمكانية التصفية حسب النوع وحالة الأرشفة'
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['system', 'user'],
    description: 'تصفية حسب نوع البرومبت'
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'تضمين البرومبتات المؤرشفة (true/false)'
  })
  @ApiOkResponse({
    description: 'تم استرجاع قائمة البرومبتات بنجاح',
    type: [BotPrompt],
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  list(
    @Query('type') type?: 'system' | 'user',
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.svc.findAll({
      type,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'عرض تفاصيل برومبت',
    description: 'استرجاع تفاصيل برومبت معين بواسطة المعرف'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiOkResponse({
    description: 'تم استرجاع تفاصيل البرومبت بنجاح',
    type: BotPrompt,
  })
  @ApiNotFoundResponse({
    description: 'البرومبت غير موجود',
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  get(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'تحديث برومبت',
    description: 'تحديث بيانات برومبت موجود'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت المراد تحديثه',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiBody({ type: UpdateBotPromptDto })
  @ApiOkResponse({
    description: 'تم تحديث البرومبت بنجاح',
    type: BotPrompt,
  })
  @ApiNotFoundResponse({
    description: 'البرومبت غير موجود',
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateBotPromptDto) {
    return this.svc.update(id, dto);
  }

  @Post(':id/active')
  @ApiOperation({
    summary: 'تفعيل/تعطيل برومبت',
    description: 'تغيير حالة تفعيل برومبت معين'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiBody({ type: SetActiveDto })
  @ApiOkResponse({
    description: 'تم تغيير حالة التفعيل بنجاح',
    type: BotPrompt,
  })
  @ApiNotFoundResponse({
    description: 'البرومبت غير موجود',
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async setActive(@Param('id') id: string, @Body() body: SetActiveDto) {
    return this.svc.setActive(id, body.active);
  }

  @Post(':id/archive')
  @ApiOperation({
    summary: 'أرشفة برومبت',
    description: 'أرشفة برومبت معين (تعطيله دون حذفه)'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت المرأرشفته',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiOkResponse({
    description: 'تم أرشفة البرومبت بنجاح',
    type: BotPrompt,
  })
  @ApiNotFoundResponse({
    description: 'البرومبت غير موجود',
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'حذف برومبت',
    description: 'حذف برومبت بشكل دائم'
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت المرحذفه',
    example: '507f1f77bcf86cd799439011'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'تم حذف البرومبت بنجاح',
  })
  @ApiNotFoundResponse({
    description: 'البرومبت غير موجود',
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
  @Get('system/active')
  @ApiOperation({
    summary: 'عرض البرومبت النشط للنظام',
    description: 'استرجاع البرومبت النشط حاليًا للنظام مع معلوماته الكاملة'
  })
  @ApiOkResponse({
    description: 'تم استرجاع البرومبت النشط بنجاح',
    type: BotPrompt,
  })
  @ApiNotFoundResponse({
    description: 'لا يوجد برومبت نشط للنظام',
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async activeSystem() {
    return this.svc.getActiveSystemPrompt();
  }
  @Get('system/active/content')
  @ApiOperation({
    summary: 'عرض محتوى البرومبت النشط',
    description: 'استرجاع محتوى البرومبت النشط للنظام فقط (بدون معلومات إضافية)'
  })
  @ApiOkResponse({
    description: 'تم استرجاع محتوى البرومبت النشط بنجاح',
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'محتوى البرومبت النشط',
          example: 'أنت مساعد ذكي يساعد المستخدمين...'
        }
      }
    }
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async activeSystemContent() {
    const content = await this.svc.getActiveSystemPromptOrDefault();
    return { content };
  }
}
