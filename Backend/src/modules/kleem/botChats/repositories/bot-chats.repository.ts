import { FilterQuery, PipelineStage, Types } from 'mongoose';
import { BotChatSession } from '../schemas/botChats.schema';

export type AppendMessage = {
  role: 'user' | 'bot';
  text: string;
  metadata?: Record<string, unknown>;
  timestamp?: Date;
};

export type BotChatSessionLean = BotChatSession & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

export interface BotChatRepository {
  createOrAppend(
    sessionId: string,
    messages: AppendMessage[],
  ): Promise<BotChatSessionLean>;

  rateMessage(
    sessionId: string,
    msgIdx: number,
    rating: 0 | 1,
    feedback?: string,
  ): Promise<void>;

  findBySession(sessionId: string): Promise<BotChatSessionLean | null>;

  findAll(
    filter: FilterQuery<BotChatSession>,
    page: number,
    limit: number,
  ): Promise<{ data: BotChatSessionLean[]; total: number }>;

  aggregate(pipeline: PipelineStage[]): Promise<any[]>;

  getFrequentBadBotReplies(
    limit: number,
  ): Promise<{ text: string; count: number; feedbacks: string[] }[]>;

  getTopQuestions(
    limit: number,
  ): Promise<{ question: string; count: number }[]>;
}
