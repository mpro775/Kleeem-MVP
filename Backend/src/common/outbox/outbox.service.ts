import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';

import { MILLISECONDS_PER_MINUTE } from '../cache/constant';

import { OutboxEvent, OutboxEventDocument } from './outbox.schema';

const MONGODB_DUPLICATE_KEY_ERROR = 11000;
const BASE_BACKOFF_MS = 5000; // 5 seconds

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

  async addEventInTx(
    data: EnqueueEventInput,
    session: ClientSession,
  ): Promise<OutboxEventDocument> {
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

  async enqueueEvent(
    data: EnqueueEventInput,
    session?: ClientSession,
  ): Promise<OutboxEventDocument | null> {
    const doc = new this.outboxModel({
      ...data,
      status: 'pending',
      attempts: 0,
      nextAttemptAt: new Date(0),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
    });

    try {
      if (session) {
        await doc.save({ session });
      } else {
        await doc.save();
      }
      return doc;
    } catch (e: unknown) {
      const error = e as { code?: number; message?: string } | undefined;
      if (
        error?.code === MONGODB_DUPLICATE_KEY_ERROR &&
        error?.message?.includes('dedupeKey')
      ) {
        // حدث مكرر: تجاهله واعتبره مُسجّل مسبقًا
        return null as unknown as OutboxEventDocument; // Allow null for duplicate events
      }
      throw e;
    }
  }

  // المطالبة الذرّية بدُفعة أحداث
  async claimBatch(
    limit = 200,
    workerId = 'dispatcher-1',
  ): Promise<OutboxEventLean[]> {
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

  async markPublished(id: string): Promise<void> {
    await this.outboxModel.updateOne(
      { _id: id },
      {
        $set: { status: 'published', publishedAt: new Date(), error: null },
        $unset: { lockedBy: '', lockedAt: '' },
      },
    );
  }

  // backoff أُسّي مع سقف 5 دقائق
  private nextAttemptDate(attempts: number): Date {
    const delay = Math.min(
      5 * MILLISECONDS_PER_MINUTE,
      Math.pow(2, attempts) * BASE_BACKOFF_MS,
    );
    return new Date(Date.now() + delay);
  }

  async reschedule(id: string, err: string, attempts: number): Promise<void> {
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
  async recoverStuckPublishing(
    olderThanMs = 5 * MILLISECONDS_PER_MINUTE,
  ): Promise<void> {
    const threshold = new Date(Date.now() - olderThanMs);
    await this.outboxModel.updateMany(
      { status: 'publishing', lockedAt: { $lt: threshold } },
      { $set: { status: 'pending' }, $unset: { lockedBy: '', lockedAt: '' } },
    );
  }
}
