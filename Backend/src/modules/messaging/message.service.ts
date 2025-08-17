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
import { GeminiService } from './gemini.service';

@Injectable()
export class MessageService {
  constructor(
    @InjectModel(MessageSession.name)
    private readonly messageModel: Model<MessageSessionDocument>,
    private readonly chatGateway: ChatGateway,
    private readonly geminiService: GeminiService,
  ) {}

  async createOrAppend(
    dto: CreateMessageDto,
    session?: ClientSession,
  ): Promise<MessageSessionDocument> {
    const mId = new Types.ObjectId(dto.merchantId);

    const existing = await this.messageModel
      .findOne({
        merchantId: mId,
        sessionId: dto.sessionId,
        channel: dto.channel,
      })
      .session(session ?? null) // ✅
      .exec();

    const toInsert = dto.messages.map((m) => {
      const tokens = m.text.split(/\s+/);
      const keywords = removeStopwords(tokens, [...ara, ...eng]);
      return {
        role: m.role,
        text: m.text,
        metadata: m.metadata || {},
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
        keywords,
      };
    });

    const lastMsg = toInsert[toInsert.length - 1];
    if (lastMsg) this.chatGateway.sendMessageToSession(dto.sessionId, lastMsg);

    if (existing) {
      existing.messages.push(...toInsert);
      existing.markModified('messages');
      await existing.save({ session }); // ✅
      return existing;
    } else {
      const [created] = await this.messageModel.create(
        [
          {
            merchantId: mId,
            sessionId: dto.sessionId,
            channel: dto.channel,
            messages: toInsert,
          },
        ],
        { session }, // ✅
      );
      return created;
    }
  }
  async rateMessage(
    sessionId: string,
    messageId: string,
    userId: string,
    rating: number,
    feedback?: string,
    merchantId?: string,
  ) {
    // حدّث الرسالة (نفس ما تعمل الآن)
    await this.messageModel.updateOne(
      { sessionId, 'messages._id': messageId },
      {
        $set: {
          'messages.$.rating': rating,
          'messages.$.feedback': feedback,
          'messages.$.ratedBy': userId,
          'messages.$.ratedAt': new Date(),
        },
      },
    );

    // إذا التقييم سلبي، استخرج نص الرسالة وولّد التوجيه واحفظه
    if (rating === 0) {
      const session = await this.messageModel.findOne({ sessionId });
      const msg = session?.messages.find(
        (m) => m._id?.toString() === messageId,
      );
      if (msg) {
        await this.geminiService.generateAndSaveInstructionFromBadReply(
          msg.text,
          merchantId,
        );
      }
    }

    return { status: 'ok' };
  }
  async findBySession(
    sessionId: string,
  ): Promise<MessageSessionDocument | null> {
    return this.messageModel.findOne({ sessionId }).exec();
  }

  async findById(id: string): Promise<MessageSessionDocument> {
    const doc = await this.messageModel.findById(id).exec();
    if (!doc) throw new NotFoundException(`Session ${id} not found`);
    return doc;
  }
  async setHandover(sessionId: string, handoverToAgent: boolean) {
    return this.messageModel.updateOne({ sessionId }, { handoverToAgent });
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
  async getFrequentBadBotReplies(limit = 10) {
    const agg = await this.messageModel.aggregate([
      { $unwind: '$messages' },
      { $match: { 'messages.rating': 0, 'messages.role': 'bot' } },
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
      feedbacks: item.feedbacks.filter(Boolean),
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
