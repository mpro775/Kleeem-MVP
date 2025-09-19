import { ClientSession, Types } from 'mongoose';
import { MessageSession } from '../schemas/message.schema';

export type MessageItem = {
  _id: Types.ObjectId;
  role: 'user' | 'bot' | string;
  text: string;
  metadata?: Record<string, any>;
  timestamp: Date;
  keywords?: string[];
  rating?: 0 | 1;
  feedback?: string | null;
  ratedBy?: Types.ObjectId;
  ratedAt?: Date;
};

export type MessageSessionEntity = MessageSession & {
  _id: Types.ObjectId;
  merchantId: Types.ObjectId;
  sessionId: string;
  channel: string;
  handoverToAgent?: boolean;
  messages: MessageItem[];
  createdAt?: Date;
  updatedAt?: Date;
};

export interface MessageRepository {
  // أساسي
  findByMerchantSessionChannel(
    merchantId: string,
    sessionId: string,
    channel: string,
    opts?: { session?: ClientSession },
  ): Promise<MessageSessionEntity | null>;

  createSessionWithMessages(
    data: {
      merchantId: string;
      sessionId: string;
      channel: string;
      messages: MessageItem[];
    },
    opts?: { session?: ClientSession },
  ): Promise<MessageSessionEntity>;

  appendMessagesById(
    id: string,
    messages: MessageItem[],
    opts?: { session?: ClientSession },
  ): Promise<MessageSessionEntity>;

  findByWidgetSlugAndSession(
    slug: string,
    sessionId: string,
    channel: 'webchat',
  ): Promise<MessageSessionEntity | null>;

  updateMessageRating(params: {
    sessionId: string;
    messageId: string;
    userId: string;
    rating: 0 | 1;
    feedback?: string;
    merchantId?: string;
  }): Promise<boolean>;

  getMessageTextById(
    sessionId: string,
    messageId: string,
  ): Promise<string | undefined>;

  findBySession(
    merchantId: string,
    sessionId: string,
  ): Promise<MessageSessionEntity | null>;
  findById(id: string): Promise<MessageSessionEntity | null>;

  setHandover(
    sessionId: string,
    merchantId: string,
    handoverToAgent: boolean,
  ): Promise<void>;

  updateById(
    id: string,
    patch: Partial<MessageSessionEntity>,
  ): Promise<MessageSessionEntity | null>;

  deleteById(id: string): Promise<boolean>;

  aggregateFrequentBadBotReplies(
    merchantId: string,
    limit?: number,
  ): Promise<Array<{ text: string; count: number; feedbacks: string[] }>>;

  findAll(filters: {
    merchantId?: string;
    channel?: string;
    limit: number;
    page: number;
  }): Promise<{ data: MessageSessionEntity[]; total: number }>;
}
