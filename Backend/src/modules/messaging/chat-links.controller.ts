// src/modules/messaging/messaging.controller.ts
import { Controller, Post, Param } from '@nestjs/common';
import { MessageService } from './message.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('chat-links')
export class ChatLinksController {
  constructor(private readonly messageService: MessageService) {}

  @Post(':merchantId')
  async createChatLink(@Param('merchantId') merchantId: string) {
    // توليد sessionId جديد
    const sessionId = uuidv4();
    // تهيئة جلسة فارغة (اختياري)
    await this.messageService.createOrAppend({
      merchantId,
      sessionId,
      channel: 'webchat',
      messages: [],
    });
    // رابط الــ embed
    const url = `${process.env.CHAT_EMBED_BASE_URL}/embed?merchantId=${merchantId}&sessionId=${sessionId}`;
    return { sessionId, url };
  }
}
