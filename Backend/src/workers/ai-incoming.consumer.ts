// src/workers/ai-incoming.consumer.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Channel, ChannelModel, ConsumeMessage } from 'amqplib';
import axios from 'axios';

type AiIncomingPayload = {
  merchantId: string;
  sessionId: string;
  channel: string;
  text: string;
  metadata?: Record<string, unknown>;
  transport?: string;
};

@Injectable()
export class AiIncomingConsumer implements OnModuleInit {
  private readonly logger = new Logger(AiIncomingConsumer.name);

  private conn: ChannelModel | null = null; // 👈 اتصال
  private ch: Channel | null = null; // 👈 قناة

  constructor(private readonly cfg: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.cfg.get<string>('RABBIT_URL');
    if (!url) {
      this.logger.error('RABBIT_URL is not set');
      return;
    }

    // Connection
    this.conn = await amqp.connect(url);

    // Channel
    this.ch = await this.conn.createChannel();

    // Queue & DLQ
    await this.ch.assertQueue('ai.reply-worker.q', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'ai.reply-worker.q.dlq',
      },
    });

    await this.ch.consume('ai.reply-worker.q', (m) => this.consume(m), {
      noAck: false,
    });
  }

  private async consume(m: ConsumeMessage | null): Promise<void> {
    if (!m || !this.ch) return;

    try {
      const content = m.content.toString();
      const payload: AiIncomingPayload = JSON.parse(
        content,
      ) as AiIncomingPayload;

      const base = (
        process.env.N8N_BASE_URL ||
        process.env.N8N_BASE ||
        ''
      ).replace(/\/+$/, '');
      const pathTpl =
        process.env.N8N_INCOMING_PATH || '/webhook/ai-agent-{merchantId}';
      const url = base + pathTpl.replace('{merchantId}', payload.merchantId);

      await axios.post(url, payload, {
        headers: { 'X-Worker-Token': process.env.WORKER_TOKEN ?? '' },
      });

      this.ch.ack(m);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error(`AI bridge failed: ${error.message}`);
      // DLQ: requeue=false
      this.ch.nack(m, false, false);
    }
  }
}
