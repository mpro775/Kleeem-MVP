// src/modules/instructions/instructions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  ForbiddenException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { InstructionsService } from './instructions.service';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { MessageService } from '../messaging/message.service';
import { GeminiService } from '../ai/gemini.service';
import { CurrentMerchantId, CurrentUser } from 'src/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

type Role = 'ADMIN' | 'MERCHANT' | 'MEMBER';

@ApiTags('التوجيهات')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('instructions')
export class InstructionsController {
  constructor(
    private readonly service: InstructionsService,
    private readonly messages: MessageService,
    private readonly gemini: GeminiService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء توجيه جديد' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        instruction: {
          type: 'string',
          description: 'نص التوجيه',
          example: 'إذا سأل العميل عن الخصومات، اعرض كود SUMMER25.',
        },
        merchantId: {
          type: 'string',
          description: 'معرف التاجر (ADMIN فقط، وإلا يُتجاهَل)',
          example: 'm_12345',
        },
        relatedReplies: {
          type: 'array',
          items: { type: 'string' },
          description: 'معرفات الردود المرتبطة (اختياري)',
        },
        type: {
          type: 'string',
          enum: ['auto', 'manual'],
          description: 'نوع التوجيه',
          example: 'manual',
        },
      },
      required: ['instruction'],
    },
  })
  @ApiResponse({ status: 201, description: 'تم إنشاء التوجيه بنجاح.' })
  @ApiForbiddenResponse({ description: 'غير مخول' })
  @ApiUnauthorizedResponse({ description: 'التوثيق مطلوب' })
  async create(
    @Body()
    dto: {
      instruction: string;
      merchantId?: string;
      relatedReplies?: string[];
      type?: 'auto' | 'manual';
    },
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    // ADMIN فقط يمرّر merchantId؛ غير ذلك استخدم JWT
    const merchantId =
      user.role === 'ADMIN' && dto.merchantId ? dto.merchantId : jwtMerchantId;

    if (!merchantId) {
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    }

    // Sanitization بسيط
    const instruction = (dto.instruction || '').trim();
    if (!instruction) throw new BadRequestException('instruction مطلوب');

    return this.service.create({
      instruction,
      merchantId,
      relatedReplies: dto.relatedReplies || [],
      type: dto.type || 'manual',
    });
  }

  @Get()
  @ApiOperation({ summary: 'الحصول على قائمة بالتوجيهات مع خيارات التصفية' })
  @ApiQuery({ name: 'merchantId', required: false })
  @ApiQuery({ name: 'active', required: false, description: 'true/false' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 30 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  async findAll(
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
    @Query('merchantId') qMerchantId: string | undefined,
    @Query('active') active?: string,
    @Query('limit') limit = '30',
    @Query('page') page = '1',
  ) {
    // إن مرّر merchantId بالاستعلام يجب أن يكون ADMIN أو يطابق JWT
    const merchantId = qMerchantId ?? jwtMerchantId;
    if (!merchantId) {
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    }
    if (qMerchantId && user.role !== 'ADMIN' && qMerchantId !== jwtMerchantId) {
      throw new ForbiddenException('غير مخوّل للوصول إلى تاجر آخر');
    }

    return this.service.findAll({
      merchantId,
      active: active === 'true' ? true : active === 'false' ? false : undefined,
      limit: Math.min(Math.max(parseInt(limit, 10) || 30, 1), 200),
      page: Math.max(parseInt(page, 10) || 1, 1),
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث توجيه موجود' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiResponse({ status: 200, description: 'تم التحديث.' })
  @ApiNotFoundResponse({ description: 'التوجيه غير موجود.' })
  async update(
    @Param('id') id: string,
    @Body()
    dto: Partial<{
      instruction: string;
      active: boolean;
      relatedReplies: string[];
    }>,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    // احضر التوجيه للتأكد من الملكية
    const instr = await this.service.findOne(id);
    if (!instr) throw new BadRequestException('التوجيه غير موجود');

    if (
      user.role !== 'ADMIN' &&
      String(instr.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException('غير مخوّل');
    }

    if (dto.instruction !== undefined) {
      dto.instruction = (dto.instruction || '').trim();
      if (!dto.instruction) {
        throw new BadRequestException('instruction لا يمكن أن يكون فارغًا');
      }
    }

    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  @ApiResponse({ status: 200, description: 'تم الحذف.' })
  @ApiNotFoundResponse({ description: 'التوجيه غير موجود.' })
  async remove(
    @Param('id') id: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    const instr = await this.service.findOne(id);
    if (!instr) throw new BadRequestException('التوجيه غير موجود');

    if (
      user.role !== 'ADMIN' &&
      String(instr.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException('غير مخوّل');
    }
    return this.service.remove(id);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'إلغاء تفعيل توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  async deactivate(
    @Param('id') id: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    const instr = await this.service.findOne(id);
    if (!instr) throw new BadRequestException('التوجيه غير موجود');

    if (
      user.role !== 'ADMIN' &&
      String(instr.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException('غير مخوّل');
    }
    return this.service.deactivate(id);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'تفعيل توجيه' })
  @ApiParam({ name: 'id', description: 'معرف التوجيه' })
  async activate(
    @Param('id') id: string,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    const instr = await this.service.findOne(id);
    if (!instr) throw new BadRequestException('التوجيه غير موجود');

    if (
      user.role !== 'ADMIN' &&
      String(instr.merchantId) !== String(jwtMerchantId)
    ) {
      throw new ForbiddenException('غير مخوّل');
    }
    return this.service.activate(id);
  }

  // جلب فقط التوجيهات الفعالة (للبوت)
  @Get('active')
  @ApiOperation({ summary: 'الحصول على جميع التوجيهات النشطة (للبوت)' })
  @ApiQuery({ name: 'merchantId', required: false })
  async getActive(
    @Query('merchantId') qMerchantId: string | undefined,
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
  ) {
    const merchantId = qMerchantId ?? jwtMerchantId;
    if (!merchantId) throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    if (qMerchantId && user.role !== 'ADMIN' && qMerchantId !== jwtMerchantId) {
      throw new ForbiddenException('غير مخوّل للوصول إلى تاجر آخر');
    }
    return this.service.getActiveInstructions(merchantId);
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'اقتراح توجيهات تلقائيًا من الردود السلبية (بدون حفظ)',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async suggest(
    @Query('limit') limit = '10',
    @CurrentMerchantId() jwtMerchantId: string | null,
  ) {
    if (!jwtMerchantId)
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');

    const n = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const bad = await this.messages.getFrequentBadBotReplies(jwtMerchantId, n);
    const items = await Promise.all(
      (bad as Array<{ text: string; count: number }>).map(async (b) => {
        const instruction = await this.gemini.generateInstructionFromBadReply(
          b.text,
        );
        return { badReply: b.text, count: b.count, instruction };
      }),
    );
    return { items };
  }

  @Post('auto/generate')
  @ApiOperation({ summary: 'توليد وحفظ توجيهات من ردود سلبية' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { badReplies: { type: 'array', items: { type: 'string' } } },
      required: ['badReplies'],
    },
  })
  async generate(
    @CurrentMerchantId() jwtMerchantId: string | null,
    @CurrentUser() user: { role: Role },
    @Body() dto: { badReplies: string[] },
  ) {
    if (!jwtMerchantId)
      throw new ForbiddenException('لا يوجد تاجر مرتبط بالحساب');
    if (!Array.isArray(dto.badReplies) || dto.badReplies.length === 0) {
      throw new BadRequestException('badReplies مطلوب');
    }

    // (اختياري) حد أعلى لحماية السيرفر
    const replies = dto.badReplies.slice(0, 50);

    const results = await Promise.all(
      replies.map(async (bad) => {
        const res = await this.gemini.generateAndSaveInstructionFromBadReply(
          String(bad || '').trim(),
          jwtMerchantId,
        );
        return { badReply: bad, instruction: res.instruction };
      }),
    );
    return { results };
  }
}
