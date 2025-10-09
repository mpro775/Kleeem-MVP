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
import { UseGuards } from '@nestjs/common';
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
import { Public } from 'src/common/decorators/public.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { TranslationService } from '../../../common/services/translation.service';

import { BotPromptService } from './botPrompt.service';
import { CreateBotPromptDto } from './dto/create-botPrompt.dto';
import { SetActiveKaleemDto } from './dto/set-active.dto';
import { UpdateBotPromptDto } from './dto/update-botPrompt.dto';
import { BotPromptLean } from './repositories/bot-prompt.repository';
import { BotPrompt } from './schemas/botPrompt.schema';
@ApiTags('kleem.botPrompt')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/kleem/bot-prompts')
export class BotPromptController {
  constructor(
    private readonly svc: BotPromptService,
    private readonly translationService: TranslationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'kleem.botPrompt.operations.create.summary',
    description: 'kleem.botPrompt.operations.create.description',
  })
  @ApiBody({ type: CreateBotPromptDto })
  @ApiCreatedResponse({
    description: 'kleem.botPrompt.responses.success.created',
    type: BotPrompt,
  })
  @ApiBadRequestResponse({
    description: 'kleem.botPrompt.responses.error.badRequest',
  })
  @ApiForbiddenResponse({
    description: 'kleem.botPrompt.responses.error.forbidden',
  })
  async create(@Body() dto: CreateBotPromptDto): Promise<BotPromptLean> {
    return this.svc.create(dto);
  }

  @Get('ping')
  @Public()
  @ApiOperation({
    summary: 'kleem.botPrompt.operations.ping.summary',
    description: 'kleem.botPrompt.operations.ping.description',
  })
  @ApiOkResponse({
    description: 'kleem.botPrompt.responses.success.serviceOk',
    schema: {
      type: 'object',
      properties: {
        ok: { type: 'boolean', example: true },
        who: { type: 'string', example: 'bot-prompts' },
      },
    },
  })
  ping(): { ok: boolean; who: string } {
    return { ok: true, who: 'bot-prompts' };
  }

  @Get()
  @ApiOperation({
    summary: 'kleem.botPrompt.operations.list.summary',
    description: 'kleem.botPrompt.operations.list.description',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['system', 'user'],
    description: 'تصفية حسب نوع البرومبت',
  })
  @ApiQuery({
    name: 'includeArchived',
    required: false,
    type: Boolean,
    description: 'تضمين البرومبتات المؤرشفة (true/false)',
  })
  @ApiOkResponse({
    description: 'kleem.botPrompt.responses.success.found',
    type: [BotPrompt],
  })
  @ApiForbiddenResponse({
    description: 'kleem.botPrompt.responses.error.forbidden',
  })
  list(
    @Query('type') type?: 'system' | 'user',
    @Query('includeArchived') includeArchived?: string,
  ): Promise<BotPromptLean[]> {
    const options: { type?: 'system' | 'user'; includeArchived?: boolean } = {
      includeArchived: includeArchived === 'true',
    };

    if (type) {
      options.type = type;
    }

    return this.svc.findAll(options);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'عرض تفاصيل برومبت',
    description: 'استرجاع تفاصيل برومبت معين بواسطة المعرف',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت',
    example: '507f1f77bcf86cd799439011',
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
  get(@Param('id') id: string): Promise<BotPromptLean | null> {
    return this.svc.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'تحديث برومبت',
    description: 'تحديث بيانات برومبت موجود',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت المراد تحديثه',
    example: '507f1f77bcf86cd799439011',
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
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBotPromptDto,
  ): Promise<BotPromptLean | null> {
    return this.svc.update(id, dto);
  }

  @Post(':id/active')
  @ApiOperation({
    summary: 'تفعيل/تعطيل برومبت',
    description: 'تغيير حالة تفعيل برومبت معين',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiBody({ type: SetActiveKaleemDto })
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
  async setActive(
    @Param('id') id: string,
    @Body() body: SetActiveKaleemDto,
  ): Promise<BotPromptLean> {
    return this.svc.setActive(id, body.active);
  }

  @Post(':id/archive')
  @ApiOperation({
    summary: 'أرشفة برومبت',
    description: 'أرشفة برومبت معين (تعطيله دون حذفه)',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت المرأرشفته',
    example: '507f1f77bcf86cd799439011',
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
  async archive(@Param('id') id: string): Promise<BotPromptLean> {
    return this.svc.archive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'حذف برومبت',
    description: 'حذف برومبت بشكل دائم',
  })
  @ApiParam({
    name: 'id',
    required: true,
    description: 'معرف البرومبت المرحذفه',
    example: '507f1f77bcf86cd799439011',
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
  async remove(@Param('id') id: string): Promise<{ deleted: boolean }> {
    return this.svc.remove(id);
  }
  @Get('system/active')
  @ApiOperation({
    summary: 'عرض البرومبت النشط للنظام',
    description: 'استرجاع البرومبت النشط حاليًا للنظام مع معلوماته الكاملة',
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
  async activeSystem(): Promise<string> {
    return this.svc.getActiveSystemPrompt();
  }
  @Get('system/active/content')
  @ApiOperation({
    summary: 'عرض محتوى البرومبت النشط',
    description:
      'استرجاع محتوى البرومبت النشط للنظام فقط (بدون معلومات إضافية)',
  })
  @ApiOkResponse({
    description: 'تم استرجاع محتوى البرومبت النشط بنجاح',
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'محتوى البرومبت النشط',
          example: 'أنت مساعد ذكي يساعد المستخدمين...',
        },
      },
    },
  })
  @ApiForbiddenResponse({
    description: 'غير مصرح - يجب أن تكون مسؤولاً',
  })
  async activeSystemContent(): Promise<{ content: string }> {
    const content = await this.svc.getActiveSystemPromptOrDefault();
    return { content };
  }
}
