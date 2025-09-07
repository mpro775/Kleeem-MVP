import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp from 'amqplib';
import axios from 'axios';

@Injectable()
export class AiIncomingConsumer implements OnModuleInit {
  private readonly logger = new Logger(AiIncomingConsumer.name);
  private ch!: amqp.Channel;

  constructor(private cfg: ConfigService) {}

  async onModuleInit() {
    const url = this.cfg.get<string>('RABBIT_URL')!;
    const conn = await amqp.connect(url);
    this.ch = await conn.createChannel();
    await this.ch.assertQueue('ai.reply-worker.q', {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': '',
        'x-dead-letter-routing-key': 'ai.reply-worker.q.dlq',
      },
    });
    this.ch.consume('ai.reply-worker.q', (m) => this.consume(m), {
      noAck: false,
    });
  }

  private async consume(m?: amqp.ConsumeMessage | null) {
    if (!m) return;
    try {
      const payload = JSON.parse(m.content.toString());
      const base = (
        process.env.N8N_BASE_URL ||
        process.env.N8N_BASE ||
        ''
      ).replace(/\/+$/, '');
      const pathTpl =
        process.env.N8N_INCOMING_PATH || '/webhook/ai-agent-{merchantId}';
      const url = base + pathTpl.replace('{merchantId}', payload.merchantId);
      // payload = { merchantId, sessionId, channel, text, metadata, transport? }
      await axios.post(url, payload, {
        headers: { 'X-Worker-Token': process.env.WORKER_TOKEN! },
      });
      this.ch.ack(m);
    } catch (e) {
      this.logger.error('AI bridge failed', (e as Error).message);
      this.ch.nack(m, false, false); // DLQ
    }
  }
}
