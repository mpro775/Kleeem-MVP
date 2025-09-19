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
  dedupeKey?: string;
}
export type OutboxEventLean = OutboxEvent & { _id: Types.ObjectId };

@Injectable()
export class OutboxService {
  constructor(
    @InjectModel(OutboxEvent.name)
    private readonly outboxModel: Model<OutboxEventDocument>,
  ) {}

  async addEventInTx(data: EnqueueEventInput, session: ClientSession) {
    const doc = new this.outboxModel({
      ...data,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(0),
      occurredAt: data.occurredAt ?? new Date().toISOString(),
    });
    await doc.save({ session });
    return doc;
  }

  async enqueueEvent(data: EnqueueEventInput, session?: ClientSession) {
    if (session) return this.addEventInTx(data, session);
    const doc = new this.outboxModel({
      ...data,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(0),
      occurredAt: data.occurredAt ?? new Date().toISOString(),
    });
    await doc.save();
    return doc;
  }

  // المطالبة الذرّية بدُفعة أحداث
  async claimBatch(limit = 200, workerId = 'dispatcher-1') {
    const claimed: OutboxEventLean[] = [];
    for (let i = 0; i < limit; i++) {
      const now = new Date();
      const doc = await this.outboxModel
        .findOneAndUpdate(
          {
            status: 'pending',
            nextAttemptAt: { $lte: now },
            attempts: { $lt: 10 },
          },
          {
            $set: {
              status: 'publishing',
              lockedBy: workerId,
              lockedAt: now,
            },
          },
          { new: true, sort: { createdAt: 1 } },
        )
        .lean<OutboxEventLean>();
      if (!doc) break;
      claimed.push(doc);
    }
    return claimed;
  }

  async markPublished(id: string) {
    await this.outboxModel.updateOne(
      { _id: id },
      {
        $set: { status: 'published', publishedAt: new Date(), error: null },
        $unset: { lockedBy: '', lockedAt: '' },
      },
    );
  }

  // backoff أُسّي مع سقف 5 دقائق
  private nextAttemptDate(attempts: number) {
    const base = 5000; // 5 ثوانٍ
    const delay = Math.min(5 * 60_000, Math.pow(2, attempts) * base);
    return new Date(Date.now() + delay);
  }

  async reschedule(id: string, err: string, attempts: number) {
    await this.outboxModel.updateOne(
      { _id: id },
      {
        $set: {
          status: 'pending',
          error: err,
          nextAttemptAt: this.nextAttemptDate(attempts),
        },
        $inc: { attempts: 1 },
        $unset: { lockedBy: '', lockedAt: '' },
      },
    );
  }

  // استرجاع الرسائل العالقة في publishing
  async recoverStuckPublishing(olderThanMs = 5 * 60_000) {
    const threshold = new Date(Date.now() - olderThanMs);
    await this.outboxModel.updateMany(
      { status: 'publishing', lockedAt: { $lt: threshold } },
      { $set: { status: 'pending' }, $unset: { lockedBy: '', lockedAt: '' } },
    );
  }
}
