// src/modules/kleem/chat/kleem-chat.controller.ts
import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsIn,
  IsObject,
  IsNotEmpty,
  Min,
  MaxLength,
} from 'class-validator';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import { BotChatsService } from '../botChats/botChats.service';
import { BotChatSessionLean } from '../botChats/repositories/bot-chats.repository';

import { KleemChatService } from './kleem-chat.service';

// DTOs for request/response schemas
class SendKaleemMessageDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    description: 'نص الرسالة المرسلة من المستخدم',
    example: 'مرحباً، أريد الاستفسار عن الخدمات المتوفرة',
    required: true,
  })
  text: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    description: 'بيانات إضافية',
    type: 'object',
    additionalProperties: true,
    example: { platform: 'web', userAgent: 'Mozilla/5.0' },
  })
  metadata?: Record<string, unknown>;
}

class RateMessageKaleemDto {
  @IsNumber()
  @Min(0)
  @ApiProperty({
    description: 'فهرس الرسالة في المحادثة (يبدأ من 0)',
    example: 2,
    required: true,
  })
  msgIdx: number;

  @IsIn([0, 1])
  @ApiProperty({
    description: 'تقييم الرسالة (0: سلبي، 1: إيجابي)',
    enum: [0, 1],
    example: 1,
    required: true,
  })
  rating: 0 | 1;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({
    description: 'تعليق إضافي على التقييم',
    example: 'كانت الإجابة مفيدة جداً',
    required: false,
  })
  feedback?: string;
}

/**
 * واجهة برمجة التطبيقات للدردشة مع بوت كليم
 * تتيح هذه النقاط النهائية إرسال الرسائل وتقييم الردود واسترجاع محادثات المستخدمين
 */
@ApiTags('كليم - الدردشة')
@Controller('kleem/chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KleemChatController {
  constructor(
    private readonly kleem: KleemChatService,
    private readonly chats: BotChatsService,
  ) {}

  /**
   * إرسال رسالة جديدة إلى البوت
   * @param sessionId معرف الجلسة
   * @param body محتوى الرسالة والبيانات الإضافية
   * @returns الرد من البوت
   */
  @Post(':sessionId/message')
  @Public()
  @ApiOperation({
    summary: 'إرسال رسالة',
    description: 'إرسال رسالة جديدة من المستخدم إلى البوت في جلسة محددة',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'معرف الجلسة الفريد',
    example: 'session-12345',
  })
  @ApiBody({
    description: 'بيانات الرسالة',
    type: SendKaleemMessageDto,
    required: true,
  })
  @ApiOkResponse({
    description: 'تم استلام الرسالة بنجاح',
    type: Object,
  })
  @ApiBadRequestResponse({
    description: 'بيانات الطلب غير صالحة',
  })
  async sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() body: SendKaleemMessageDto,
  ): Promise<{ status: string }> {
    return this.kleem.handleUserMessage(sessionId, body.text, body.metadata);
  }

  /**
   * تقييم رسالة من البوت
   * @param sessionId معرف الجلسة
   * @param body بيانات التقييم
   * @returns تأكيد التقييم
   */
  @Post(':sessionId/rate')
  @Public()
  @ApiOperation({
    summary: 'تقييم رسالة',
    description: 'تقييم رسالة من البوت في جلسة محددة',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'معرف الجلسة الفريد',
    example: 'session-12345',
  })
  @ApiBody({
    description: 'بيانات التقييم',
    type: RateMessageKaleemDto,
    required: true,
  })
  @ApiOkResponse({
    description: 'تم تسجيل التقييم بنجاح',
  })
  @ApiBadRequestResponse({
    description: 'بيانات التقييم غير صالحة',
  })
  @ApiNotFoundResponse({
    description: 'الجلسة أو الرسالة غير موجودة',
  })
  async rate(
    @Param('sessionId') sessionId: string,
    @Body() body: RateMessageKaleemDto,
  ): Promise<{ status: string }> {
    return this.chats.rateMessage(
      sessionId,
      body.msgIdx,
      body.rating,
      body.feedback,
    );
  }

  /**
   * استرجاع محادثة كاملة
   * @param sessionId معرف الجلسة
   * @returns تفاصيل الجلسة والرسائل
   */
  @Get(':sessionId')
  @Public()
  @ApiOperation({
    summary: 'استرجاع المحادثة',
    description: 'استرجاع كافة الرسائل في جلسة محددة',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'معرف الجلسة الفريد',
    example: 'session-12345',
  })
  @ApiOkResponse({
    description: 'تم استرجاع المحادثة بنجاح',
    type: Object,
  })
  @ApiNotFoundResponse({
    description: 'الجلسة غير موجودة',
  })
  async getSession(
    @Param('sessionId') sessionId: string,
  ): Promise<BotChatSessionLean | null> {
    return this.chats.findBySession(sessionId);
  }
}
