// src/modules/kleem/webhook/kleem-webhook.controller.ts

import {
  Controller,
  Post,
  Body,
  Param,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

import { BotChatsService } from '../botChats/botChats.service';
import { AppendMessage } from '../botChats/repositories/bot-chats.repository';
import { BotChatSessionLean } from '../botChats/repositories/bot-chats.repository';
import { KleemChatService } from '../chat/kleem-chat.service';
import { KleemWsMessage } from '../ws/kleem-ws.types';

// DTOs for request/response schemas
class MessageDto {
  @ApiProperty({
    description: 'دور المرسل (user أو bot أو agent)',
    example: 'user',
    enum: ['user', 'bot', 'agent'],
  })
  role!: 'user' | 'bot' | 'agent';

  @ApiProperty({
    description: 'نص الرسالة',
    example: 'مرحباً، كيف يمكنني المساعدة؟',
    type: String,
  })
  text!: string;

  @ApiPropertyOptional({
    description: 'بيانات إضافية',
    type: Object,
    additionalProperties: true,
    example: {},
  })
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'طابع زمني للرسالة',
    type: String,
    format: 'date-time',
    example: '2023-01-01T00:00:00.000Z',
  })
  timestamp?: string;
}

class ConversationRequestDto {
  @ApiProperty({
    description: 'مصفوفة من الرسائل',
    type: [MessageDto],
    example: [
      {
        role: 'user',
        text: 'مرحباً، كيف يمكنني المساعدة؟',
        metadata: {},
      },
    ],
  })
  messages!: MessageDto[];
}

/**
 * واجهة برمجة التطبيقات لمعالجة Webhooks الخاصة بمنصة كليم
 * هذه النقاط النهائية مصممة للاستخدام من قبل أنظمة خارجية للتفاعل مع المحادثات
 */
@ApiTags('كليم - Webhooks')
@Controller('webhooks/kleem')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class KleemWebhookController {
  constructor(
    private readonly chatsSvc: BotChatsService,
    private readonly events: EventEmitter2,
    private readonly kleemChat: KleemChatService, // ✅ أضِف هذا
  ) {}

  /**
   * معالجة محادثة جديدة أو موجودة
   * يستخدم هذا النقطة النهائية لإضافة رسائل جديدة إلى محادثة موجودة أو إنشاء محادثة جديدة
   */
  @Post('conversation/:sessionId')
  @Public()
  @ApiOperation({
    summary: 'إضافة رسائل إلى محادثة',
    description: 'إضافة رسائل جديدة إلى محادثة موجودة أو إنشاء محادثة جديدة',
  })
  @ApiParam({
    name: 'sessionId',
    description: 'معرف الجلسة الفريد',
    example: 'session-12345',
  })
  @ApiBody({
    description: 'بيانات الرسائل المطلوب إضافتها',
    type: ConversationRequestDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'تمت إضافة الرسائل بنجاح',
    type: Object,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'بيانات الطلب غير صالحة',
  })
  async handleKleemConversation(
    @Param('sessionId') sessionId: string,
    @Body() body: { messages: AppendMessage[] },
  ): Promise<BotChatSessionLean> {
    return this.chatsSvc.createOrAppend(sessionId, body.messages);
  }
  /**
   * إضافة رد آلي إلى المحادثة
   * يستخدم هذا النقطة النهائية لإضافة رد آلي إلى محادثة معينة
   */
  @Post('bot-reply/:sessionId')
  @Public()
  async botReply(
    @Param('sessionId') sessionId: string,
    @Body() body: { text?: string; metadata?: Record<string, unknown> },
  ): Promise<{ sessionId: string; msgIdx: number }> {
    const text = body?.text ?? '';
    if (!sessionId || !text)
      throw new BadRequestException('sessionId and text are required');

    // ✅ أوقف مؤشر “يكتب” مباشرة قبل بث الرد
    this.kleemChat.stopTyping(sessionId);

    const saved = await this.chatsSvc.createOrAppend(sessionId, [
      { role: 'bot', text, metadata: body.metadata ?? {} },
    ]);
    const msgIdx = saved.messages.length - 1;

    const wsMsg: KleemWsMessage = { role: 'bot', text, msgIdx };
    this.events.emit('kleem.bot_reply', { sessionId, message: wsMsg });
    this.events.emit('kleem.admin_new_message', { sessionId, message: wsMsg });

    return { sessionId, msgIdx };
  }
  // يمكن إضافة نقاط نهاية إضافية لمعالجة أنواع أخرى من Webhooks
}
