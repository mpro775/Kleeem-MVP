// src/modules/outbox/outbox.dispatcher.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxService } from './outbox.service';
import { RabbitService } from '../../infra/rabbit/rabbit.service';
import { Types } from 'mongoose';

type OutboxEvt = {
  _id: Types.ObjectId | string;
  exchange: string;
  routingKey: string;
  eventType: string;
  occurredAt?: string;
  aggregateId: string;
  aggregateType: string;
  payload: Record<string, unknown>;
};

@Injectable()
export class OutboxDispatcher {
  private logger = new Logger(OutboxDispatcher.name);

  constructor(
    private readonly outbox: OutboxService,
    private readonly rabbit: RabbitService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async tick(): Promise<void> {
    const batch = (await this.outbox.pullBatch(200)) as OutboxEvt[];
    if (batch.length === 0) return;

    for (const ev of batch) {
      const idStr = typeof ev._id === 'string' ? ev._id : ev._id.toString();
      try {
        await this.rabbit.publish(ev.exchange, ev.routingKey, {
          type: ev.eventType,
          occurredAt: ev.occurredAt,
          aggregate: { id: ev.aggregateId, type: ev.aggregateType },
          payload: ev.payload,
        });
        await this.outbox.markPublished(idStr);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await this.outbox.markFailed(idStr, msg);
        this.logger.error(`Publish failed (${idStr}): ${msg}`);
      }
    }
  }
}
