import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { BotChatsService } from './botChats.service';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Bot Chats')
@ApiBearerAuth()
@Controller('admin/kleem/bot-chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class BotChatsController {
  constructor(private readonly svc: BotChatsService) {}

  @Post(':sessionId')
  @ApiOperation({ summary: 'حفظ رسائل جديدة في جلسة المحادثة' })
  @ApiParam({ name: 'sessionId', description: 'معرف الجلسة', example: 'session_12345' })
  @ApiBody({
    description: 'بيانات الرسائل المراد حفظها',
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'bot'], example: 'user' },
              text: { type: 'string', example: 'مرحباً، كيف يمكنني المساعدة؟' },
              metadata: { type: 'object', example: { key: 'value' } },
              timestamp: { type: 'string', format: 'date-time', example: '2025-08-16T04:00:00.000Z' }
            },
            required: ['role', 'text']
          },
          example: [{
            role: 'user',
            text: 'مرحباً، كيف يمكنني المساعدة؟',
            metadata: {}
          }]
        }
      },
      required: ['messages']
    }
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'تم حفظ الرسائل بنجاح' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'غير مصرح' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'غير مصرح' })
  async saveMessage(
    @Param('sessionId') sessionId: string,
    @Body()
    body: {
      messages: {
        role: 'user' | 'bot';
        text: string;
        metadata?: Record<string, unknown>;
        timestamp?: Date;
      }[];
    },
  ) {
    return this.svc.createOrAppend(sessionId, body.messages);
  }

  @Patch(':sessionId/rate/:msgIdx')
  @ApiOperation({ summary: 'تقييم رسالة معينة في المحادثة' })
  @ApiParam({ name: 'sessionId', description: 'معرف الجلسة', example: 'session_12345' })
  @ApiParam({ name: 'msgIdx', description: 'فهرس الرسالة', example: '0' })
  @ApiBody({
    description: 'تقييم الرسالة',
    schema: {
      type: 'object',
      properties: {
        rating: { type: 'number', enum: [0, 1], example: 1, description: '0 = سيء، 1 = جيد' },
        feedback: { type: 'string', example: 'الرد كان مفيداً', description: 'تعليق اختياري' }
      },
      required: ['rating']
    }
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم التقييم بنجاح' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'الرسالة غير موجودة' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'بيانات غير صالحة' })
  async rateMessage(
    @Param('sessionId') sessionId: string,
    @Param('msgIdx') msgIdx: string,
    @Body() body: { rating: 0 | 1; feedback?: string },
  ) {
    return this.svc.rateMessage(
      sessionId,
      Number(msgIdx),
      body.rating,
      body.feedback,
    );
  }

  @Get(':sessionId')
  @ApiOperation({ summary: 'الحصول على محادثة محددة' })
  @ApiParam({ name: 'sessionId', description: 'معرف الجلسة', example: 'session_12345' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم استرجاع المحادثة بنجاح' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'المحادثة غير موجودة' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.svc.findBySession(sessionId);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة بجميع المحادثات مع إمكانية التصفية والترقيم' })
  @ApiQuery({ name: 'page', required: false, description: 'رقم الصفحة', example: '1' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد العناصر في الصفحة', example: '20' })
  @ApiQuery({ name: 'q', required: false, description: 'بحث في نصوص المحادثات', example: 'مرحباً' })
  @ApiResponse({ status: HttpStatus.OK, description: 'تم استرجاع المحادثات بنجاح' })
  async list(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('q') q?: string,
  ) {
    return this.svc.findAll(Number(page) || 1, Number(limit) || 20, q);
  }

  @Get('stats/top-questions/list')
  @ApiOperation({ summary: 'أكثر الأسئلة شيوعاً من المستخدمين' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد الأسئلة المطلوبة', example: '10' })
  @ApiResponse({ status: HttpStatus.OK, description: 'قائمة بالأسئلة الأكثر شيوعاً' })
  async topQuestions(@Query('limit') limit?: string) {
    return this.svc.getTopQuestions(Number(limit) || 10);
  }

  @Get('stats/bad-bot-replies/list')
  @ApiOperation({ summary: 'الردود التي حصلت على تقييم سيء من المستخدمين' })
  @ApiQuery({ name: 'limit', required: false, description: 'عدد الردود المطلوبة', example: '10' })
  @ApiResponse({ status: HttpStatus.OK, description: 'قائمة بالردود التي حصلت على تقييم سيء' })
  async badReplies(@Query('limit') limit?: string) {
    return this.svc.getFrequentBadBotReplies(Number(limit) || 10);
  }
}
