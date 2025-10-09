// ---------------------------
// File: src/modules/messaging/message.service.ts
// ---------------------------

import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ClientSession, Types } from 'mongoose';

import { GeminiService } from '../ai/gemini.service';
import { ChatGateway } from '../chat/chat.gateway';

import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import {
  MessageItem,
  MessageRepository,
  MessageSessionEntity,
} from './repositories/message.repository';
import { MESSAGE_SESSION_REPOSITORY } from './tokens';

@Injectable()
export class MessageService {
  constructor(
    @Inject(MESSAGE_SESSION_REPOSITORY)
    private readonly messagesRepo: MessageRepository,
    private readonly chatGateway: ChatGateway,
    private readonly geminiService: GeminiService,
  ) {}

  private mapMessages(dto: CreateMessageDto): MessageItem[] {
    return (
      dto.messages?.map((m) => ({
        _id: new Types.ObjectId(),
        role: m.role as 'user' | 'bot' | 'agent',
        text: m.text ?? '',
        metadata: m.metadata || {},
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        keywords: (m.text ?? '').split(/\s+/).filter((word) => word.length > 2),
      })) ?? []
    );
  }

  private async getOrCreateSession(
    dto: CreateMessageDto,
    toInsert: MessageItem[],
    session?: ClientSession,
  ): Promise<MessageSessionEntity> {
    const existing = await this.messagesRepo.findByMerchantSessionChannel(
      dto.merchantId ?? '',
      dto.sessionId ?? '',
      dto.channel ?? '',
      session ? { session } : {},
    );

    if (existing) {
      return this.messagesRepo.appendMessagesById(
        String(existing._id),
        toInsert,
        session ? { session } : {},
      );
    }

    return this.messagesRepo.createSessionWithMessages(
      {
        merchantId: dto.merchantId ?? '',
        sessionId: dto.sessionId ?? '',
        channel: dto.channel ?? '',
        messages: toInsert,
      },
      session ? { session } : {},
    );
  }

  async createOrAppend(
    dto: CreateMessageDto,
    session?: ClientSession,
  ): Promise<MessageSessionEntity> {
    const toInsert = this.mapMessages(dto);
    const doc = await this.getOrCreateSession(dto, toInsert, session);

    const lastMsg = toInsert[toInsert.length - 1];
    if (lastMsg) {
      const outgoingMessage = {
        id: String(lastMsg._id),
        text: lastMsg.text,
        role: lastMsg.role === 'bot' ? 'system' : lastMsg.role,
        merchantId: dto.merchantId ?? '',
      } as const;
      this.chatGateway.sendMessageToSession(
        dto.sessionId ?? '',
        outgoingMessage,
      );
    }

    return doc;
  }

  async findByWidgetSlugAndSession(
    slug: string,
    sessionId: string,
    channel: 'webchat',
  ): Promise<MessageSessionEntity | null> {
    return this.messagesRepo.findByWidgetSlugAndSession(
      slug,
      sessionId,
      channel,
    );
  }

  async rateMessage(
    sessionId: string,
    messageId: string,
    userId: string,
    rating: 0 | 1,
    feedback?: string,
    merchantId?: string,
  ): Promise<{ status: string }> {
    const ok = await this.messagesRepo.updateMessageRating({
      sessionId,
      messageId,
      userId,
      rating,
      ...(feedback && { feedback }),
      ...(merchantId && { merchantId }),
    });

    if (!ok) {
      throw new BadRequestException('لم يتم العثور على الرسالة للتقييم');
    }

    if (rating === 0) {
      const text = await this.messagesRepo.getMessageTextById(
        sessionId,
        messageId,
      );
      if (text) {
        await this.geminiService.generateAndSaveInstructionFromBadReply(
          text,
          merchantId,
        );
      }
    }

    return { status: 'ok' };
  }

  async findBySession(
    sessionId: string,
    merchantId: string,
  ): Promise<MessageSessionEntity | null> {
    return this.messagesRepo.findBySession(merchantId, sessionId);
  }

  async findById(id: string): Promise<MessageSessionEntity> {
    const doc = await this.messagesRepo.findById(id);
    if (!doc) throw new NotFoundException(`Session ${id} not found`);
    return doc;
  }

  async setHandover(
    sessionId: string,
    handoverToAgent: boolean,
    merchantId: string,
  ): Promise<void> {
    await this.messagesRepo.setHandover(sessionId, merchantId, handoverToAgent);
  }

  async update(
    id: string,
    dto: UpdateMessageDto,
  ): Promise<MessageSessionEntity> {
    const updated = await this.messagesRepo.updateById(
      id,
      dto as Partial<MessageSessionEntity>,
    );
    if (!updated) throw new NotFoundException(`Session ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.messagesRepo.deleteById(id);
    return { deleted };
  }

  async getFrequentBadBotReplies(
    merchantId: string,
    limit = 10,
  ): Promise<Array<{ text: string; count: number; feedbacks: string[] }>> {
    return this.messagesRepo.aggregateFrequentBadBotReplies(merchantId, limit);
  }

  async findAll(filters: {
    merchantId?: string;
    channel?: string;
    limit: number;
    page: number;
  }): Promise<{ data: MessageSessionEntity[]; total: number }> {
    return this.messagesRepo.findAll(filters);
  }
}
