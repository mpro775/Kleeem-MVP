import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Connection, Channel } from 'amqplib';

@Injectable()
export class RabbitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitService.name);
  private conn?: Connection;
  private ch?: Channel;
  private connecting = false;
  private url: string;

  constructor(private cfg: ConfigService) {
    this.url =
      this.cfg.get<string>('RABBIT_URL') ||
      'amqp://kaleem:supersecret@rabbitmq:5672/kleem';
  }

  async onModuleInit() {
    await this.connect();
  }

  private async connect(retryMs = 3000): Promise<void> {
    if (this.connecting) {
      this.logger.warn('Connection attempt already in progress, skipping...');
      return;
    }
    this.connecting = true;

    while (true) {
      try {
        this.logger.log(`Connecting to RabbitMQ at ${this.url} ...`);
        this.conn = await amqp.connect(this.url);
        this.ch = await this.conn.createConfirmChannel();

        this.conn.on('close', () => {
          this.logger.warn('RabbitMQ connection closed, reconnecting...');
          this.reconnect();
        });
        this.conn.on('error', (err) => {
          this.logger.error(`RabbitMQ connection error: ${err.message}`);
          this.reconnect();
        });

        // تأكيد الـ Exchanges المطلوبة
        const exchanges = [
          'chat.incoming',
          'chat.reply',
          'knowledge.index',
          'catalog.sync',
          'commerce.sync',
          'webhook.dispatch',
          'analytics.events',
        ];
        for (const ex of exchanges) {
          await this.ch.assertExchange(ex, 'topic', { durable: true });
        }

        this.logger.log('✅ RabbitMQ connected & exchanges asserted');
        break; // اخرج من اللوب إذا نجح الاتصال
      } catch (err) {
        this.logger.error(
          `❌ Failed to connect to RabbitMQ: ${(err as Error).message}`,
        );
        await new Promise((res) => setTimeout(res, retryMs));
      }
    }

    this.connecting = false;
  }

  private reconnect() {
    this.conn = undefined;
    this.ch = undefined;
    setTimeout(() => void this.connect().catch(() => {}), 3000);
  }
  async subscribe(
    exchange: string,
    bindingKey: string,
    onMessage: (msg: any) => Promise<void> | void,
    opts: { queue?: string; prefetch?: number } = {},
  ) {
    if (!this.ch) throw new Error('Channel not ready');

    await this.ch.assertExchange(exchange, 'topic', { durable: true });

    let queueName: string;

    if (opts.queue) {
      // ✅ لا تعلن من جديد صفاً مسمّى — فقط تأكّد أنه موجود
      await this.ch.checkQueue(opts.queue);
      queueName = opts.queue;
    } else {
      // صف مؤقّت (يُعلن محلياً) لا يحتوي DLQ ولا يتعارض
      const q = await this.ch.assertQueue('', {
        exclusive: true,
        autoDelete: true,
      });
      queueName = q.queue;
    }

    await this.ch.bindQueue(queueName, exchange, bindingKey);
    if (opts.prefetch) await this.ch.prefetch(opts.prefetch);

    await this.ch.consume(
      queueName,
      async (m) => {
        if (!m) return;
        try {
          const content = JSON.parse(m.content.toString('utf8'));
          await onMessage(content);
          this.ch!.ack(m);
        } catch {
          this.ch!.nack(m, false, false); // DLQ سيتعامل
        }
      },
      { noAck: false },
    );
  }

  async publish(exchange: string, routingKey: string, message: any) {
    if (!this.ch) {
      this.logger.warn('Channel not ready, message not published');
      return;
    }
    const buf = Buffer.from(JSON.stringify(message));
    this.ch.publish(exchange, routingKey, buf, {
      contentType: 'application/json',
      persistent: true,
    });
    await this.ch.waitForConfirms();
  }

  async onModuleDestroy() {
    try {
      await this.ch?.close();
      await this.conn?.close();
    } catch (err) {
      this.logger.error('Error while closing RabbitMQ connection', err);
    }
  }
}
