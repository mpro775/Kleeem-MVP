// ---------------------------
// File: src/modules/messaging/message.service.ts
// ---------------------------
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import {
  MessageSession,
  MessageSessionDocument,
} from './schemas/message.schema';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { removeStopwords, ara, eng } from 'stopword';
import { ChatGateway } from '../chat/chat.gateway';
import { GeminiService } from '../ai/gemini.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(MessageSession.name)
    private readonly messageModel: Model<MessageSessionDocument>,
    private readonly chatGateway: ChatGateway,
    private readonly geminiService: GeminiService,
  ) {}

  async createOrAppend(dto: CreateMessageDto, session?: ClientSession) {
    const mId = new Types.ObjectId(dto.merchantId);

    const existing = await this.messageModel
      .findOne({
        merchantId: mId,
        sessionId: dto.sessionId,
        channel: dto.channel,
      })
      .session(session ?? null)
      .exec();

    const toInsert = dto.messages.map((m) => ({
      _id: new Types.ObjectId(),
      role: m.role,
      text: m.text,
      metadata: m.metadata || {},
      timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      keywords: removeStopwords(m.text.split(/\s+/), [...ara, ...eng]),
    }));

    const lastMsg = toInsert[toInsert.length - 1];

    if (existing) {
      existing.messages.push(...toInsert);
      existing.markModified('messages');
      await existing.save({ session });
    } else {
      await this.messageModel.create(
        [
          {
            merchantId: mId,
            sessionId: dto.sessionId,
            channel: dto.channel,
            messages: toInsert,
          },
        ],
        { session },
      );
    }

    // ✅ إرسال واحد فقط بعد تأكيد الكتابة
    if (lastMsg) this.chatGateway.sendMessageToSession(dto.sessionId, lastMsg);

    return (
      existing ??
      (await this.messageModel
        .findOne({
          merchantId: mId,
          sessionId: dto.sessionId,
          channel: dto.channel,
        })
        .exec())
    );
  }
  async findByWidgetSlugAndSession(
    slug: string,
    sessionId: string,
    channel: 'webchat',
  ) {
    const Widget = this.messageModel.db.model('ChatWidgetSettings');
    const w = await Widget.findOne({
      $or: [{ widgetSlug: slug }, { publicSlug: slug }],
    })
      .select('merchantId')
      .lean();
    if (!w) return null;

    return this.messageModel
      .findOne({
        merchantId: new Types.ObjectId(String((w as any).merchantId)),
        sessionId,
        channel,
      })
      .lean()
      .exec();
  }

  async rateMessage(
    sessionId: string,
    messageId: string,
    userId: string,
    rating: 0 | 1,
    feedback?: string,
    merchantId?: string,
  ) {
    const res = await this.messageModel.updateOne(
      { sessionId, 'messages._id': new Types.ObjectId(messageId) },
      { merchantId: new Types.ObjectId(merchantId) },
      {
        $set: {
          'messages.$.rating': rating,
          'messages.$.feedback': feedback ?? null,
          'messages.$.ratedBy': new Types.ObjectId(userId),
          'messages.$.ratedAt': new Date(),
        },
      },
    );

    if (res.matchedCount === 0) {
      throw new Error('لم يتم العثور على الرسالة للتقييم'); // أو BadRequestException
    }

    if (rating === 0) {
      const session = await this.messageModel
        .findOne(
          { sessionId },
          { messages: { $elemMatch: { _id: new Types.ObjectId(messageId) } } },
        )
        .lean();

      const msg = session?.messages?.[0];
      if (msg?.text) {
        await this.geminiService.generateAndSaveInstructionFromBadReply(
          msg.text,
          merchantId,
        );
      }
    }

    return { status: 'ok' };
  }

  async findBySession(sessionId: string, merchantId: string) {
    return this.messageModel
      .findOne({ sessionId, merchantId: new Types.ObjectId(merchantId) })
      .exec();
  }

  async findById(id: string): Promise<MessageSessionDocument> {
    const doc = await this.messageModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Session ${id} not found`);
    return doc;
  }
  async setHandover(
    sessionId: string,
    handoverToAgent: boolean,
    merchantId: string,
  ) {
    return this.messageModel.updateOne(
      { sessionId, merchantId: new Types.ObjectId(merchantId) },
      { handoverToAgent },
    );
  }

  async update(
    id: string,
    dto: UpdateMessageDto,
  ): Promise<MessageSessionDocument> {
    const updated = await this.messageModel
      .findByIdAndUpdate(id, dto, { new: true })
      .exec();
    if (!updated) throw new NotFoundException(`Session ${id} not found`);
    return updated;
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    const res = await this.messageModel.deleteOne({ _id: id }).exec();
    return { deleted: res.deletedCount > 0 };
  }
  async getFrequentBadBotReplies(merchantId: string, limit = 10) {
    const mid = new Types.ObjectId(merchantId);
    const agg = await this.messageModel.aggregate([
      { $match: { merchantId: mid } }, // <-- مهم: تقييد بالتاجر
      { $unwind: '$messages' },
      { $match: { 'messages.role': 'bot', 'messages.rating': 0 } },
      {
        $group: {
          _id: '$messages.text',
          count: { $sum: 1 },
          feedbacks: { $push: '$messages.feedback' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: limit },
    ]);

    return agg.map((item) => ({
      text: item._id,
      count: item.count,
      feedbacks: (item.feedbacks || []).filter(Boolean),
    }));
  }
  async findAll(filters: {
    merchantId?: string;
    channel?: string;
    limit: number;
    page: number;
  }): Promise<{ data: MessageSessionDocument[]; total: number }> {
    const query: any = {};
    if (filters.merchantId)
      query.merchantId = new Types.ObjectId(filters.merchantId);
    if (filters.channel) query.channel = filters.channel;

    const total = await this.messageModel.countDocuments(query);
    const data = await this.messageModel
      .find(query)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .sort({ updatedAt: -1 })
      .exec();

    return { data, total };
  }
}
