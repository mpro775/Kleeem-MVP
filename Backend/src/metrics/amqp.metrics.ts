// src/metrics/amqp.metrics.ts
import { Injectable } from '@nestjs/common';
import { InjectMetric, makeCounterProvider } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

export const AmqpMetricsProviders = [
  makeCounterProvider({
    name: 'amqp_messages_published_total',
    help: 'AMQP published messages',
    labelNames: ['exchange', 'routing_key'],
  }),
  makeCounterProvider({
    name: 'amqp_messages_consumed_total',
    help: 'AMQP consumed messages',
    labelNames: ['queue'],
  }),
  makeCounterProvider({
    name: 'worker_errors_total',
    help: 'Worker processing errors',
    labelNames: ['worker', 'queue'],
  }),
];

@Injectable()
export class AmqpMetrics {
  constructor(
    @InjectMetric('amqp_messages_published_total')
    private readonly pub: Counter<string>,
    @InjectMetric('amqp_messages_consumed_total')
    private readonly con: Counter<string>,
    @InjectMetric('worker_errors_total')
    private readonly err: Counter<string>,
  ) {}
  incPublished(exchange: string, routingKey: string) {
    this.pub.inc({ exchange, routing_key: routingKey });
  }
  incConsumed(queue: string) {
    this.con.inc({ queue });
  }
  incError(worker: string, queue: string) {
    this.err.inc({ worker, queue });
  }
}
