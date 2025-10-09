// src/infra/rabbit/rabbit.service.ts

// builtins
import { randomUUID } from 'crypto';

// external
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import amqp, {
  type ChannelModel,
  type ConfirmChannel,
  type ConsumeMessage,
  type Options,
} from 'amqplib';

// -----------------------------------------------------------------------------
// Types
type MessagePrimitive = string | number | boolean | null;
type MessagePayload =
  | MessagePrimitive
  | Record<string, unknown>
  | MessagePrimitive[];

interface MessageProps {
  messageId?: string;
  headers?: Record<string, unknown>;
}

export type OnMessage = (
  msg: MessagePayload,
  props: MessageProps,
) => Promise<void> | void;

export type DeadLetterCfg =
  | boolean
  | {
      exchange?: string;
      queue?: string;
      routingKey?: string;
    };

export interface SubscribeOpts {
  queue?: string;
  durable?: boolean;
  prefetch?: number;
  deadLetter?: DeadLetterCfg;
  assert?: boolean;
  requeueOnError?: boolean;
}

export interface PublishOpts extends Omit<Options.Publish, 'headers'> {
  headers?: Record<string, unknown>;
  messageId?: string;
  confirmTimeoutMs?: number;
}

interface SubscriptionRecord {
  exchange: string;
  bindingKey: string;
  onMessage: OnMessage;
  opts: SubscribeOpts;
  consumerTag?: string;
  queueName?: string;
}

// -----------------------------------------------------------------------------
// Constants
const DEFAULT_PREFETCH = 50;
const MAX_RETRY_DELAY_MS = 30_000;
const INITIAL_RETRY_DELAY_MS = 300;
const RANDOM_JITTER_MAX_MS = 500;
const CONFIRM_TIMEOUT_DEFAULT_MS = 10_000;
const DLQ_SUFFIX = '.dlq';
const DLX_SUFFIX = '.dlx';
const DL_ROUTING_DEFAULT = '#';
const HEARTBEAT_SEC = 30;
const AMQP_PRECONDITION_FAILED_CODE = 406;
const MS_TO_SEC = 1000;

// -----------------------------------------------------------------------------

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function safeJsonParse(buf: Buffer): MessagePayload {
  try {
    return JSON.parse(buf.toString('utf8')) as MessagePayload;
  } catch {
    return null;
  }
}

function toStringSafe(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function pickHeaders(h: unknown): Record<string, unknown> | undefined {
  return isObject(h) ? h : undefined;
}

type DeadLetterResolved = {
  dlx: string;
  dlq: string;
  dlrk: string;
} | null;

function resolveDeadLetter(
  queue: string,
  cfg: DeadLetterCfg | undefined,
): DeadLetterResolved {
  if (!cfg) return null;
  if (cfg === true) {
    return {
      dlx: `${queue}${DLX_SUFFIX}`,
      dlq: `${queue}${DLQ_SUFFIX}`,
      dlrk: DL_ROUTING_DEFAULT,
    };
  }
  const dlx = cfg.exchange ?? `${queue}${DLX_SUFFIX}`;
  const dlq = cfg.queue ?? `${queue}${DLQ_SUFFIX}`;
  const dlrk = cfg.routingKey ?? DL_ROUTING_DEFAULT;
  return { dlx, dlq, dlrk };
}

async function assertDeadLetter(
  ch: ConfirmChannel,
  resolved: DeadLetterResolved,
): Promise<void> {
  if (!resolved) return;
  const { dlx, dlq, dlrk } = resolved;
  if (dlx) {
    await ch.assertExchange(dlx, 'topic', { durable: true });
    await ch.assertQueue(dlq, { durable: true });
    await ch.bindQueue(dlq, dlx, dlrk);
  }
}

function queueArgumentsForDL(
  resolved: DeadLetterResolved,
): Record<string, unknown> | undefined {
  if (!resolved) return undefined;
  const { dlx, dlrk } = resolved;
  return {
    'x-dead-letter-exchange': dlx,
    'x-dead-letter-routing-key': dlrk,
  };
}

// -----------------------------------------------------------------------------

@Injectable()
export class RabbitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitService.name);
  private readonly url: string;
  private conn?: ChannelModel;
  private ch?: ConfirmChannel;

  // منع اتصالات متوازية
  private connectPromise?: Promise<void>;

  // تعقب الاشتراكات لإعادة الاشتراك بعد إعادة الاتصال
  private subscriptions: SubscriptionRecord[] = [];

  // Exchanges افتراضية
  private readonly defaultExchanges = [
    'chat.incoming',
    'chat.reply',
    'knowledge.index',
    'catalog.sync',
    'commerce.sync',
    'webhook.dispatch',
    'analytics.events',
    'products',
  ];

  constructor(private readonly cfg: ConfigService) {
    this.url =
      this.cfg.get<string>('RABBIT_URL') ??
      'amqp://kaleem:supersecret@rabbitmq:5672/kleem';
  }

  async onModuleInit(): Promise<void> {
    await this.ensureConnected();
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.ch?.close();
    } catch (e) {
      this.logger.error(
        'Error while closing RabbitMQ connection',
        toStringSafe(e),
      );
    }
  }

  // ----------------------------- Public API ----------------------------------

  async publish(
    exchange: string,
    routingKey: string,
    message: MessagePayload,
    opts: PublishOpts = {},
  ): Promise<void> {
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

    const timeoutMs =
      opts.confirmTimeoutMs ??
      this.cfg.get<number>('vars.rabbit.confirmTimeoutMs') ??
      CONFIRM_TIMEOUT_DEFAULT_MS;

    await Promise.race([
      ch.waitForConfirms(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Confirm timeout')), timeoutMs),
      ),
    ]);
  }

  async subscribe(
    exchange: string,
    bindingKey: string,
    onMessage: OnMessage,
    opts: SubscribeOpts = {},
  ): Promise<void> {
    const rec: SubscriptionRecord = { exchange, bindingKey, onMessage, opts };
    this.subscriptions.push(rec);
    await this.ensureConnected();
    await this.applySubscription(rec);
  }

  // ----------------------------- Internals -----------------------------------

  private async ensureConnected(): Promise<void> {
    if (this.ch && this.conn) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.connectWithRetry();
    try {
      await this.connectPromise;
    } finally {
      // Clear the promise reference after connection attempt
      this.connectPromise = undefined!;
    }
  }

  private async connectWithRetry(): Promise<void> {
    let attempt = 0;

    // backoff أُسّي مع jitter

    while (true) {
      attempt++;
      try {
        this.logger.log(`Connecting to RabbitMQ at ${this.url} ...`);
        // ✅ النوع الصحيح: Promise<Connection>
        this.conn = await amqp.connect(this.url, {
          heartbeat: HEARTBEAT_SEC,
          locale: 'en_US',
        });

        this.conn.on('error', (err: unknown) => {
          this.logger.error(`RabbitMQ connection error: ${toStringSafe(err)}`);
        });
        this.conn.on('close', () => {
          this.logger.warn('RabbitMQ connection closed');
          this.handleDisconnect();
        });

        this.ch = await this.conn.createConfirmChannel();
        this.ch.on('error', (err: unknown) => {
          this.logger.error(`Channel error: ${toStringSafe(err)}`);
        });
        this.ch.on('close', () => {
          this.logger.warn('Channel closed');
        });

        // Prefetch عام للقناة
        await this.ch.prefetch(DEFAULT_PREFETCH);

        // Assert exchanges (idempotent)
        for (const ex of this.defaultExchanges) {
          await this.ch.assertExchange(ex, 'topic', { durable: true });
        }

        // إعادة تطبيق كل الاشتراكات
        for (const rec of this.subscriptions) {
          await this.applySubscription(rec);
        }

        this.logger.log('✅ RabbitMQ connected & topology asserted');
        return;
      } catch (e) {
        const msg = toStringSafe(e);
        const delay = Math.min(
          MAX_RETRY_DELAY_MS,
          2 ** Math.min(8, attempt) * INITIAL_RETRY_DELAY_MS +
            Math.floor(Math.random() * RANDOM_JITTER_MAX_MS),
        );
        this.logger.error(
          `❌ RabbitMQ connect failed (attempt ${attempt}): ${msg} — retrying in ${Math.round(
            delay / MS_TO_SEC,
          )}s`,
        );
        await this.sleep(delay);
      }
    }
  }

  private handleDisconnect(): void {
    this.conn = undefined!;
    this.ch = undefined!;
  }

  private async applySubscription(rec: SubscriptionRecord): Promise<void> {
    const ch = this.ch!;
    await ch.assertExchange(rec.exchange, 'topic', { durable: true });

    const queueName = await this.prepareQueue(ch, rec);
    if (rec.opts.prefetch && rec.opts.prefetch > 0) {
      await ch.prefetch(rec.opts.prefetch);
    }
    await ch.bindQueue(queueName, rec.exchange, rec.bindingKey);

    // إعادة إنشاء المستهلك عند إعادة الاشتراك
    if (rec.consumerTag) {
      try {
        await ch.cancel(rec.consumerTag);
      } catch {
        // ignore
      }
    }

    const { consumerTag } = await ch.consume(
      queueName,
      async (m: ConsumeMessage | null) => {
        if (!m) return;

        try {
          const content = safeJsonParse(m.content);
          const headers = pickHeaders(m.properties.headers);
          const messageProps: MessageProps = {
            messageId: m.properties.messageId as string,
          };

          if (headers) {
            messageProps.headers = headers;
          }

          await rec.onMessage(content, messageProps);
          ch.ack(m);
        } catch (e) {
          this.logger.error(
            `Consumer error on ${rec.exchange}:${rec.bindingKey}: ${toStringSafe(
              e,
            )}`,
          );
          ch.nack(m, false, rec.opts.requeueOnError ?? false);
        }
      },
      { noAck: false },
    );

    rec.consumerTag = consumerTag;
    rec.queueName = queueName;
  }

  /**
   * تحضير/تأكيد الطابور مع دعم DLQ (تعقيد ≤ 12)
   */
  private async prepareQueue(
    ch: ConfirmChannel,
    rec: SubscriptionRecord,
  ): Promise<string> {
    const { queue, durable = true, assert = true } = rec.opts;

    // طابور مؤقت
    if (!queue) {
      const q = await ch.assertQueue('', { exclusive: true, autoDelete: true });
      return q.queue;
    }

    // Passive check فقط
    if (!assert) {
      await ch.checkQueue(queue);
      return queue;
    }

    const dlResolved = resolveDeadLetter(queue, rec.opts.deadLetter);
    const args = queueArgumentsForDL(dlResolved);

    // تأكيد DLX/DLQ إن لزم
    await assertDeadLetter(ch, dlResolved);

    const qopts: amqp.Options.AssertQueue = { durable, arguments: args };

    try {
      await ch.assertQueue(queue, qopts);
    } catch (e) {
      if (this.isPreconditionFailed(e)) {
        this.logger.warn(
          `Queue ${queue} exists with different args — falling back to passive checkQueue. If you intend to change args, delete the queue or set assert:false.`,
        );
        await ch.checkQueue(queue);
      } else {
        throw e;
      }
    }

    return queue;
  }

  private isPreconditionFailed(err: unknown): boolean {
    if (!isObject(err)) return false;
    const code = (err as { code?: unknown }).code;
    const message = (err as { message?: unknown }).message;
    return (
      code === AMQP_PRECONDITION_FAILED_CODE ||
      /PRECONDITION_FAILED/i.test(String(message))
    );
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((r) => setTimeout(r, ms));
  }
}
