import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GeminiService } from './gemini.service';
interface InstructionResult {
  badReply: string;
  instruction: string;
}
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly geminiService: GeminiService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء جلسة جديدة أو إضافة رسائل لجلسة موجودة' })
  @ApiBody({ type: CreateMessageDto })
  @ApiCreatedResponse({
    description: 'تم إنشاء أو تعديل الجلسة بنجاح',
    schema: {
      example: {
        _id: '6651abc...',
        merchantId: '663...',
        sessionId: '9665xxxxxxx',
        channel: 'whatsapp',
        messages: [
          {
            role: 'customer',
            text: 'أبغى شاحن آيفون',
            timestamp: '2025-06-12T10:00:00Z',
            metadata: {},
          },
        ],
        createdAt: '2025-06-12T10:00:00Z',
        updatedAt: '2025-06-12T10:01:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'البيانات غير صحيحة أو ناقصة' })
  @Public()
  createOrAppend(@Body() dto: CreateMessageDto) {
    return this.messageService.createOrAppend(dto);
  }

  @Patch('session/:sessionId/handover')
  @Public()
  @ApiOperation({
    summary: 'تسليم/استلام المحادثة من/إلى الوكيل البشري',
    description: 'تحديث حالة تسليم المحادثة بين البوت والوكيل البشري'
  })
  @ApiParam({ 
    name: 'sessionId',
    description: 'معرف الجلسة (عادةً رقم الهاتف)',
    example: '9665xxxxxxx'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        handoverToAgent: { 
          type: 'boolean',
          description: 'قيمة منطقية تحدد ما إذا كان سيتم تسليم المحادثة للوكيل البشري (true) أو استعادتها للبوت (false)',
          example: true
        }
      },
      required: ['handoverToAgent']
    }
  })
  @ApiOkResponse({
    description: 'تم تحديث حالة التسليم بنجاح',
    schema: {
      example: { success: true }
    }
  })
  @ApiBadRequestResponse({ 
    description: 'بيانات الطلب غير صالحة أو ناقصة',
    schema: {
      example: {
        statusCode: 400,
        message: 'يجب توفير معرف الجلسة وقيمة التسليم',
        error: 'Bad Request'
      }
    }
  })
  @ApiNotFoundResponse({
    description: 'لم يتم العثور على الجلسة المحددة',
    schema: {
      example: {
        statusCode: 404,
        message: 'الجلسة غير موجودة',
        error: 'Not Found'
      }
    }
  })
  async setHandover(
    @Param('sessionId') sessionId: string,
    @Body('handoverToAgent') handoverToAgent: boolean,
  ) {
    await this.messageService.setHandover(sessionId, handoverToAgent);
    return { success: true };
  }

  @Get('session/:sessionId')
  @Public()
  @ApiOperation({
    summary: 'جلب محادثة كاملة حسب sessionId (رقم الهاتف غالبًا)',
  })
  @ApiParam({ name: 'sessionId', description: 'معرف الجلسة' })
  @ApiOkResponse({
    description: 'محادثة واحدة بجميع الرسائل',
  })
  findBySession(@Param('sessionId') sessionId: string) {
    return this.messageService.findBySession(sessionId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'جلب الجلسة حسب _id' })
  @ApiParam({ name: 'id', description: 'معرف الوثيقة في Mongo' })
  @ApiOkResponse()
  @ApiNotFoundResponse({ description: 'الجلسة غير موجودة' })
  findOne(@Param('id') id: string) {
    return this.messageService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث بيانات الجلسة (مثل tags أو ملاحظات)' })
  @ApiParam({ name: 'id', description: 'معرف الوثيقة في Mongo' })
  @ApiBody({ type: UpdateMessageDto })
  @ApiOkResponse({ description: 'تم التحديث' })
  @ApiNotFoundResponse({ description: 'الجلسة غير موجودة' })
  async update(@Param('id') id: string, @Body() dto: UpdateMessageDto) {
    return this.messageService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف جلسة كاملة من قاعدة البيانات' })
  @ApiParam({ name: 'id', description: 'معرف الوثيقة في Mongo' })
  @ApiOkResponse({ description: 'تم الحذف بنجاح' })
  @ApiNotFoundResponse({ description: 'الجلسة غير موجودة' })
  async remove(@Param('id') id: string) {
    return this.messageService.remove(id);
  }

  @Get()
  @ApiOperation({ summary: 'جلب كل الجلسات مع خيارات فلترة' })
  @ApiOkResponse({
    description: 'نتائج الجلسات مع عدد الإجمالي',
  })
  @ApiQuery({ name: 'merchantId', required: false })
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: ['whatsapp', 'telegram', 'webchat'],
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  async findAll(
    @Query('merchantId') merchantId?: string,
    @Query('channel') channel?: string,
    @Query('limit') limit = '20',
    @Query('page') page = '1',
  ) {
    return this.messageService.findAll({
      merchantId,
      channel,
      limit: parseInt(limit, 10),
      page: parseInt(page, 10),
    });
  }
  @Patch('session/:sessionId/messages/:messageId/rate')
  @ApiOperation({
    summary: 'تقييم رسالة معينة في المحادثة',
    description: 'يسمح للمستخدم بتقييم رسالة محددة في المحادثة مع إمكانية إضافة تعليق'
  })
  @ApiParam({
    name: 'sessionId',
    description: 'معرف الجلسة التي تحتوي على الرسالة',
    example: '9665xxxxxxx'
  })
  @ApiParam({
    name: 'messageId',
    description: 'معرف الرسالة المراد تقييمها',
    example: '60d0fe4f5311236168a109ca'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        rating: {
          type: 'number',
          description: 'تقييم الرسالة (عادةً من 1 إلى 5)',
          minimum: 1,
          maximum: 5,
          example: 4
        },
        feedback: {
          type: 'string',
          description: 'تعليق أو ملاحظات إضافية حول التقييم',
          example: 'الرد كان مفيداً لكنه يحتوي على بعض المعلومات غير الدقيقة',
          nullable: true
        }
      },
      required: ['rating']
    }
  })
  @ApiOkResponse({
    description: 'تم تقييم الرسالة بنجاح',
    schema: {
      example: { status: 'ok' }
    }
  })
  @ApiBadRequestResponse({
    description: 'بيانات التقييم غير صالحة',
    schema: {
      example: {
        statusCode: 400,
        message: 'يجب تقديم تقييم صالح بين 1 و 5',
        error: 'Bad Request'
      }
    }
  })
  @ApiUnauthorizedResponse({
    description: 'غير مصرح للمستخدم بتنفيذ هذه العملية',
    schema: {
      example: {
        statusCode: 401,
        message: 'غير مصرح',
        error: 'Unauthorized'
      }
    }
  })
  async rateMessage(
    @Param('sessionId') sessionId: string,
    @Param('messageId') messageId: string,
    @Body() body: { rating: number; feedback?: string },
    @Req() req,
  ) {
    const userId = req.user._id;
    const { rating, feedback } = body;
    await this.messageService.rateMessage(
      sessionId,
      messageId,
      userId,
      rating,
      feedback,
    );
    return { status: 'ok' };
  }
  @Post('generate-instructions-from-bad-replies')
  @ApiOperation({
    summary: 'إنشاء تعليمات من الردود السيئة',
    description: 'يقوم بتحليل الردود السيئة وإنشاء تعليمات لتحسين أداء البوت'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        badReplies: {
          type: 'array',
          items: {
            type: 'string',
            description: 'نص الرد السيء',
            example: 'عذراً، لم أفهم سؤالك. هل يمكنك إعادة صياغته؟'
          },
          description: 'قائمة بالردود السيئة التي تحتاج إلى تحسين',
          minItems: 1
        },
        merchantId: {
          type: 'string',
          description: 'معرف التاجر (اختياري) لربط التعليمات بتاجر معين',
          example: '60d0fe4f5311236168a109ca',
          nullable: true
        }
      },
      required: ['badReplies']
    }
  })
  @ApiCreatedResponse({
    description: 'تم إنشاء التعليمات بنجاح',
    schema: {
      example: [
        {
          badReply: 'عذراً، لم أفهم سؤالك',
          instruction: 'عندما لا تفهم سؤال العميل، اطلب منه توضيح سؤاله بطريقة مهذبة وتقديم أمثلة للأسئلة المتوقعة.'
        }
      ]
    }
  })
  @ApiBadRequestResponse({
    description: 'بيانات الطلب غير صالحة',
    schema: {
      example: {
        statusCode: 400,
        message: 'يجب تقديم قائمة بالردود السيئة',
        error: 'Bad Request'
      }
    }
  })
  async generateInstructions(
    @Body() dto: { badReplies: string[]; merchantId?: string },
  ) {
    const results: InstructionResult[] = [];
    for (const badReply of dto.badReplies) {
      const res =
        await this.geminiService.generateAndSaveInstructionFromBadReply(
          badReply,
          dto.merchantId,
        );
      results.push({ badReply, instruction: res.instruction });
    }
    return results;
  }
  @Get('bad-bot-instructions')
  @ApiOperation({
    summary: 'الحصول على تعليمات لتحسين أداء البوت',
    description: 'يحصل على قائمة بالردود التي تحتاج إلى تحسين مع تعليمات مقترحة'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'الحد الأقصى لعدد النتائج المراد إرجاعها',
    type: Number,
    example: 10
  })
  @ApiOkResponse({
    description: 'قائمة بالتعليمات المقترحة',
    schema: {
      example: {
        instructions: [
          'عند سؤال العميل عن موعد التسليم، يجب أن يكون الرد دقيقاً مع ذكر المدة المتوقعة وأي شروط إضافية.',
          'عند طلب العميل التحدث مع ممثل خدمة العملاء، يجب توجيهه إلى القسم المناسب مع رقم الهاتف وأوقات العمل.'
        ]
      }
    }
  })
  async getBadBotInstructions(@Query('limit') limit = 10) {
    const badReplies = await this.messageService.getFrequentBadBotReplies(
      Number(limit),
    );
    const instructions: string[] = [];
    for (const reply of badReplies) {
      const instruction =
        await this.geminiService.generateInstructionFromBadReply(reply.text);
      instructions.push(instruction);
    }
    // يمكن حفظها في قاعدة بيانات أو ملف أيضاً إذا رغبت
    return { instructions };
  }

  @Get(':sessionId/ratings')
  @ApiOperation({
    summary: 'الحصول على تقييمات الرسائل في جلسة معينة',
    description: 'يعيد قائمة بالرسائل التي تم تقييمها في جلسة محددة مع تفاصيل التقييمات'
  })
  @ApiParam({
    name: 'sessionId',
    description: 'معرف الجلسة المراد استعراض تقييماتها',
    example: '9665xxxxxxx'
  })
  @ApiOkResponse({
    description: 'قائمة بالرسائل المقيّمة في الجلسة',
    schema: {
      example: [
        {
          _id: '60d0fe4f5311236168a109ca',
          text: 'مرحباً، كيف يمكنني مساعدتك اليوم؟',
          rating: 4,
          feedback: 'الرد كان سريعاً لكنه عام جداً',
          ratedBy: '60d0fe4f5311236168a109cb',
          ratedAt: '2023-05-20T10:30:00Z'
        }
      ]
    }
  })
  @ApiNotFoundResponse({
    description: 'الجلسة غير موجودة أو لا تحتوي على تقييمات',
    schema: {
      example: {
        statusCode: 404,
        message: 'لم يتم العثور على الجلسة أو لا توجد تقييمات',
        error: 'Not Found'
      }
    }
  })
  async getRatedMessages(@Param('sessionId') sessionId: string) {
    const session = await this.messageService.findBySession(sessionId);
    if (!session) return [];
    return session.messages.filter((msg) => msg.rating !== null);
  }
}
