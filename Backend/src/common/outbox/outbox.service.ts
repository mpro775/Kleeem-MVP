// src/modules/outbox/outbox.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { OutboxEvent, OutboxEventDocument } from './outbox.schema';

export interface EnqueueEventInput {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: Record<string, unknown>;
  exchange: string;
  routingKey: string;
  occurredAt?: string;
}
export type OutboxEventLean = OutboxEvent & { _id: Types.ObjectId };

@Injectable()
export class OutboxService {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEventDocument>,
  ) {}

  async addEventInTx(
    data: EnqueueEventInput,
    session: ClientSession,
  ): Promise<OutboxEventDocument> {
    const doc = new this.outboxModel({
      ...data,
      status: 'pending',
      attempts: 0,
      occurredAt: data.occurredAt ?? new Date().toISOString(),
    });
    await doc.save({ session });
    return doc;
  }

  async enqueueEvent(
    data: EnqueueEventInput,
    session?: ClientSession,
  ): Promise<OutboxEventDocument> {
    if (session) return await this.addEventInTx(data, session);

    const doc = new this.outboxModel({
      ...data,
      status: 'pending',
      attempts: 0,
      occurredAt: data.occurredAt ?? new Date().toISOString(),
    });
    await doc.save();
    return doc;
  }

  async markPublished(id: string): Promise<void> {
    await this.outboxModel.updateOne(
      { _id: id },
      { $set: { status: 'published', publishedAt: new Date() } },
    );
  }

  async markFailed(id: string, err: string): Promise<void> {
    await this.outboxModel.updateOne(
      { _id: id },
      { $set: { status: 'failed', error: err }, $inc: { attempts: 1 } },
    );
  }

  async pullBatch(limit = 200): Promise<OutboxEventLean[]> {
    return await this.outboxModel
      .find({ status: 'pending', attempts: { $lt: 10 } })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean<OutboxEventLean[]>()
      .exec();
  }
}
