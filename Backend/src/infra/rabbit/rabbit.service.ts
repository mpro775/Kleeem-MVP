// src/infra/rabbit/rabbit.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, { Connection, Channel, Options, ConsumeMessage } from 'amqplib';
import { randomUUID } from 'crypto';

type OnMessage = (
  msg: any,
  props: { messageId?: string; headers?: any },
) => Promise<void> | void;

type DeadLetterCfg =
  | boolean
  | {
      exchange?: string; // default: <queue>.dlx
      queue?: string; // default: <queue>.dlq
      routingKey?: string; // default: #
    };

export interface SubscribeOpts {
  queue?: string; // اسم الطابور لو تبي دائم
  durable?: boolean; // افتراضي true للطوابير المسمّاة
  prefetch?: number; // افتراضي 50
  deadLetter?: DeadLetterCfg; // تفعيل DLQ تلقائيًا
  assert?: boolean; // افتراضي true (assertQueue idempotent)
  requeueOnError?: boolean; // افتراضي false (أرسل لـ DLQ)
}

export interface PublishOpts extends Omit<Options.Publish, 'headers'> {
  headers?: Record<string, any>;
  messageId?: string; // إن لم يُمرّر نولّده
  confirmTimeoutMs?: number; // مهلة انتظار الـ confirm
}

interface SubscriptionRecord {
  exchange: string;
  bindingKey: string;
  onMessage: OnMessage;
  opts: SubscribeOpts;
  consumerTag?: string;
  queueName?: string;
}

@Injectable()
export class RabbitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitService.name);
  private readonly url: string;
  private conn?: Connection;
  private ch?: Channel;

  // منع اتصالات متوازية
  private connectPromise?: Promise<void>;

  // تعقب الاشتراكات لإعادة الاشتراك بعد إعادة الاتصال
  private subscriptions: SubscriptionRecord[] = [];

  // اضبط هنا Exchanges الافتراضية لمرة واحدة
  private readonly defaultExchanges = [
    'chat.incoming',
    'chat.reply',
    'knowledge.index',
    'catalog.sync',
    'commerce.sync',
    'webhook.dispatch',
    'analytics.events',
    'products', // لإيفينتات المنتجات
  ];

  constructor(private cfg: ConfigService) {
    this.url =
      this.cfg.get<string>('RABBIT_URL') ||
      'amqp://kaleem:supersecret@rabbitmq:5672/kleem';
  }

  async onModuleInit() {
    await this.ensureConnected();
  }

  async onModuleDestroy() {
    try {
      await this.ch?.close();
      await this.conn?.close();
    } catch (err) {
      this.logger.error('Error while closing RabbitMQ connection', err as any);
    }
  }

  // -------- Public API --------
  private isPreconditionFailed(err: any) {
    return (
      err?.code === 406 || /PRECONDITION_FAILED/i.test(String(err?.message))
    );
  }

  /**
   * نشر رسالة (idempotent عبر messageId) + انتظار confirm بمهلة.
   */
  async publish(
    exchange: string,
    routingKey: string,
    message: any,
    opts: PublishOpts = {},
  ) {
    await this.ensureConnected();

    const ch = this.ch!;
    await ch.assertExchange(exchange, 'topic', { durable: true });

    const messageId = opts.messageId ?? randomUUID();
    const buf = Buffer.from(JSON.stringify(message));

    const props: Options.Publish = {
      contentType: 'application/json',
      persistent: true,
      messageId,
      headers: opts.headers ?? {},
      correlationId: opts.correlationId,
      replyTo: opts.replyTo,
      expiration: opts.expiration,
      priority: opts.priority,
      mandatory: opts.mandatory,
    };

    ch.publish(exchange, routingKey, buf, props);

    const timeoutMs = opts.confirmTimeoutMs ?? 10_000;
    await this.waitForConfirmsWithTimeout(timeoutMs);
  }

  /**
   * الاشتراك في exchange/bindingKey؛ يعيد إنشاء الـ queue والربط بعد أي reconnect تلقائيًا.
   */
  async subscribe(
    exchange: string,
    bindingKey: string,
    onMessage: OnMessage,
    opts: SubscribeOpts = {},
  ) {
    // سجّل الاشتراك ثم نفّذه (حتى لو ما كان في قناة جاهزة الآن)
    const rec: SubscriptionRecord = { exchange, bindingKey, onMessage, opts };
    this.subscriptions.push(rec);
    await this.ensureConnected();
    await this.applySubscription(rec);
  }

  // -------- Internals --------

  private async ensureConnected(): Promise<void> {
    if (this.ch && this.conn) return; // جاهز
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.connectWithRetry();
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = undefined;
    }
  }

  private async connectWithRetry(): Promise<void> {
    // backoff أُسّي مع jitter
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        this.logger.log(`Connecting to RabbitMQ at ${this.url} ...`);
        this.conn = await amqp.connect(this.url, {
          heartbeat: 30,
          locale: 'en_US',
        });
        this.conn.on('error', (err) => {
          this.logger.error(`RabbitMQ connection error: ${err.message}`);
        });
        this.conn.on('close', () => {
          this.logger.warn('RabbitMQ connection closed');
          this.handleDisconnect();
        });

        this.ch = await this.conn.createConfirmChannel();
        this.ch.on('error', (err) => {
          this.logger.error(`Channel error: ${err.message}`);
        });
        this.ch.on('close', () => {
          this.logger.warn('Channel closed');
        });

        // Prefetch عام للقناة (يمكنك تغييره لاحقًا في applySubscription)
        await this.ch.prefetch(50);

        // Assert exchanges (idempotent)
        for (const ex of this.defaultExchanges) {
          await this.ch.assertExchange(ex, 'topic', { durable: true });
        }

        // إعادة تطبيق كل الاشتراكات (queues/binds/consumers)
        for (const rec of this.subscriptions) {
          await this.applySubscription(rec);
        }

        this.logger.log('✅ RabbitMQ connected & topology asserted');
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const delay = Math.min(
          30_000,
          2 ** Math.min(8, attempt) * 300 + Math.floor(Math.random() * 500),
        );
        this.logger.error(
          `❌ RabbitMQ connect failed (attempt ${attempt}): ${msg} — retrying in ${Math.round(delay / 1000)}s`,
        );
        await this.sleep(delay);
      }
    }
  }

  private handleDisconnect() {
    this.conn = undefined;
    this.ch = undefined;
    // محاولة إعادة الاتصال في الخلفية عند أول استدعاء لاحق (ensureConnected)
  }

  private async applySubscription(rec: SubscriptionRecord) {
    const ch = this.ch!;
    await ch.assertExchange(rec.exchange, 'topic', { durable: true });

    const {
      queue,
      durable = true,
      prefetch,
      deadLetter = false,
      assert = true,
      requeueOnError = false,
    } = rec.opts;

    let queueName: string;

    if (queue) {
      if (assert) {
        const qopts: amqp.Options.AssertQueue = { durable };

        if (deadLetter) {
          const dlx =
            typeof deadLetter === 'object' && 'exchange' in deadLetter
              ? (deadLetter as any).exchange
              : `${queue}.dlx`;
          const dlq =
            typeof deadLetter === 'object' && (deadLetter as any).queue
              ? (deadLetter as any).queue
              : `${queue}.dlq`;
          const dlrk =
            typeof deadLetter === 'object' && (deadLetter as any).routingKey
              ? (deadLetter as any).routingKey
              : '#';

          // لا تحاول assertExchange لو dlx === '' (default exchange)
          if (dlx) {
            await ch.assertExchange(dlx, 'topic', { durable: true });
            await ch.assertQueue(dlq, { durable: true });
            await ch.bindQueue(dlq, dlx, dlrk);
          }

          qopts.arguments = {
            'x-dead-letter-exchange': dlx, // قد تكون '' لمطابقة الموجود
            'x-dead-letter-routing-key': dlrk,
          };
        }

        try {
          await ch.assertQueue(queue, qopts);
        } catch (err) {
          if (this.isPreconditionFailed(err)) {
            this.logger.warn(
              `Queue ${queue} exists with different args — falling back to passive checkQueue. If you intend to change args, delete the queue or set assert:false.`,
            );
            await ch.checkQueue(queue);
          } else {
            throw err;
          }
        }
      } else {
        // Passive path للطوابير القائمة سلفًا
        await ch.checkQueue(queue);
      }

      queueName = queue;
    } else {
      const q = await ch.assertQueue('', { exclusive: true, autoDelete: true });
      queueName = q.queue;
    }

    if (prefetch && prefetch > 0) await ch.prefetch(prefetch);
    await ch.bindQueue(queueName, rec.exchange, rec.bindingKey);

    if (rec.consumerTag) {
      try {
        await ch.cancel(rec.consumerTag);
      } catch {}
    }

    const { consumerTag } = await ch.consume(
      queueName,
      async (m: ConsumeMessage | null) => {
        if (!m) return;
        try {
          const content = safeJsonParse(m.content);
          await rec.onMessage(content, {
            messageId: m.properties.messageId,
            headers: m.properties.headers,
          });
          ch.ack(m);
        } catch (e) {
          this.logger.error(
            `Consumer error on ${rec.exchange}:${rec.bindingKey}: ${e instanceof Error ? e.message : e}`,
          );
          ch.nack(m, false, requeueOnError);
        }
      },
      { noAck: false },
    );

    rec.consumerTag = consumerTag;
    rec.queueName = queueName;
  }

  private async waitForConfirmsWithTimeout(ms?: number) {
    const ch = this.ch!;
    const timeoutMs =
      ms ?? this.cfg.get<number>('vars.rabbit.confirmTimeoutMs')!;
    await Promise.race([
      ch.waitForConfirms(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Confirm timeout')), timeoutMs),
      ),
    ]);
  }

  private sleep(ms: number) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

function safeJsonParse(buf: Buffer) {
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    return null;
  }
}
