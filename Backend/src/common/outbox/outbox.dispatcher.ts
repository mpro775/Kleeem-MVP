import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { RabbitService } from '../../infra/rabbit/rabbit.service';

import { OutboxService } from './outbox.service';

@Injectable()
export class OutboxDispatcher {
  private logger = new Logger(OutboxDispatcher.name);
  private workerId = `dispatcher@${process.pid}`;

  constructor(
    private readonly outbox: OutboxService,
    private readonly rabbit: RabbitService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reap(): Promise<void> {
    await this.outbox.recoverStuckPublishing();
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async tick(): Promise<void> {
    const batch = await this.outbox.claimBatch(200, this.workerId);
    if (batch.length === 0) return;

    for (const ev of batch) {
      const idStr = typeof ev._id === 'string' ? ev._id : ev._id.toString();
      try {
        await this.rabbit.publish(
          ev.exchange,
          ev.routingKey,
          {
            type: ev.eventType,
            occurredAt: ev.occurredAt,
            aggregate: { id: ev.aggregateId, type: ev.aggregateType },
            payload: ev.payload,
          },
          {
            messageId: idStr,
            persistent: true,
            contentType: 'application/json',
          },
        );
        await this.outbox.markPublished(idStr);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Publish failed (${idStr}): ${msg}`);
        await this.outbox.reschedule(idStr, msg, ev.attempts);
      }
    }
  }
}
