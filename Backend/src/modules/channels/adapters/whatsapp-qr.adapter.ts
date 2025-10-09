// ============== External imports ==============
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

// ============== Internal imports ==============
import { EvolutionService } from '../../integrations/evolution.service';
import { ChannelDocument, ChannelStatus } from '../schemas/channel.schema';
import { mapEvoStatus } from '../utils/evo-status.util';
import { encryptSecret } from '../utils/secrets.util';

import {
  ChannelAdapter,
  ConnectResult,
  Status,
  WebhookResult,
} from './channel-adapter';

// ============== Constants ==============
const WEBHOOK_SUFFIX = '/webhooks' as const;
const WEBHOOK_NAMESPACE = 'whatsapp_qr' as const;
const WEBHOOK_EVENTS = ['MESSAGES_UPSERT'] as const;

function trimTrailingSlashes(base: string): string {
  return base.replace(/\/+$/, '');
}

function withWebhooksBase(base: string): string {
  return /\/webhooks$/i.test(base) ? base : `${base}${WEBHOOK_SUFFIX}`;
}

/** يبني رابط الويبهوك النهائي بأمان (بدون فراغات/سلاشات زائدة). */
function buildWebhookUrl(rawBase: unknown, channelId: unknown): string {
  const safeBase =
    typeof rawBase === 'string' ? trimTrailingSlashes(rawBase) : '';
  const hooksBase = withWebhooksBase(safeBase);
  return `${hooksBase}/${WEBHOOK_NAMESPACE}/${String(channelId)}`;
}

@Injectable()
export class WhatsAppQrAdapter implements ChannelAdapter {
  private readonly logger = new Logger(WhatsAppQrAdapter.name);

  constructor(
    private readonly evo: EvolutionService,
    private readonly config: ConfigService,
  ) {}

  /** ينشئ جلسة QR ويضبط الويبهوك ويخزّن الحالة الأولية. */
  async connect(c: ChannelDocument): Promise<ConnectResult> {
    const instanceName = `whatsapp_${String(c.merchantId)}_${String(c.id)}`;

    // تنظيف أي جلسة قديمة بنفس الاسم
    await this.evo.deleteInstance(instanceName).catch(() => undefined);

    // بدء جلسة جديدة
    const token = uuidv4();
    const { qr, instanceId } = await this.evo.startSession(instanceName, token);

    // ضبط Webhook
    const rawBase = this.config.get<string>('PUBLIC_WEBHOOK_BASE') ?? '';
    const webhookUrl = buildWebhookUrl(rawBase, c.id);
    await this.evo.setWebhook(
      instanceName,
      webhookUrl,
      [...WEBHOOK_EVENTS],
      true,
      true,
    );

    // تخزين البيانات في القناة
    c.sessionId = instanceName;
    c.instanceId = instanceId;
    c.qr = qr;
    c.webhookUrl = webhookUrl;
    c.accessTokenEnc = encryptSecret(token);
    c.enabled = true;
    c.status = ChannelStatus.PENDING;
    await c.save();

    // تحديث الحالة فورًا إن أمكن
    await this.tryRefreshStatus(c);

    return { mode: 'qr', qr, webhookUrl };
  }

  /** يفصل القناة ويحدث الحالة محليًا. */
  async disconnect(c: ChannelDocument): Promise<void> {
    if (c.sessionId) {
      await this.evo.deleteInstance(c.sessionId).catch(() => undefined);
    }
    c.enabled = false;
    c.status = ChannelStatus.DISCONNECTED;
    await c.save();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  refresh(_c: ChannelDocument): Promise<void> {
    return Promise.resolve();
  }

  /** يجلب الحالة من Evolution ويحدّث التخزين إن تغيّرت. */
  async getStatus(c: ChannelDocument): Promise<Status> {
    if (!c.sessionId) {
      return { status: ChannelStatus.DISCONNECTED };
    }
    try {
      const inst = await this.evo.getStatus(c.sessionId as unknown as string);
      const mapped = mapEvoStatus(inst as unknown as Record<string, unknown>);
      if (mapped && mapped !== c.status) {
        c.status = mapped;
        if (mapped === ChannelStatus.CONNECTED)
          c.qr = undefined as unknown as string;
        await c.save();
      }
      return {
        status: mapped ?? c.status,
        details: inst as unknown as Record<string, unknown>,
      };
    } catch {
      return { status: c.status };
    }
  }

  /** يرسل رسالة نصية عبر الجلسة القائمة. */
  async sendMessage(
    c: ChannelDocument,
    to: string,
    text: string,
  ): Promise<void> {
    if (!c.sessionId) throw new Error('WhatsApp QR not configured');
    await this.evo.sendMessage(c.sessionId, to, text);
  }

  /** معالِج ويبهوك بسيط. */
  handleWebhook(): Promise<WebhookResult> {
    return Promise.resolve({ ok: true });
  }

  // ============== Private helpers ==============

  /** يحاول جلب الحالة فور الاتصال وتحديث القناة إن تغيّرت. */
  private async tryRefreshStatus(c: ChannelDocument): Promise<void> {
    try {
      const inst = c.sessionId ? await this.evo.getStatus(c.sessionId) : null;
      const mapped = inst
        ? mapEvoStatus(inst as unknown as Record<string, unknown>)
        : null;
      if (mapped && mapped !== c.status) {
        c.status = mapped;
        if (mapped === ChannelStatus.CONNECTED)
          c.qr = undefined as unknown as string;
        await c.save();
      }
    } catch (err) {
      // لا نُفشل الاتصال بسبب قراءة حالة فورية
      this.logger.debug?.(
        `Immediate status refresh failed: ${String((err as Error).message ?? err)}`,
      );
    }
  }
}
