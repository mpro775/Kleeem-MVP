// src/modules/channels/adapters/whatsapp-qr.adapter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import {
  ChannelAdapter,
  ConnectResult,
  Status,
  WebhookResult,
} from './channel-adapter';
import { ChannelDocument, ChannelStatus } from '../schemas/channel.schema';
import { EvolutionService } from '../../integrations/evolution.service';
import { encryptSecret } from '../utils/secrets.util';
import { mapEvoStatus } from '../utils/evo-status.util';

@Injectable()
export class WhatsAppQrAdapter implements ChannelAdapter {
  private readonly logger = new Logger(WhatsAppQrAdapter.name);

  constructor(
    private readonly evo: EvolutionService,
    private readonly config: ConfigService,
  ) {}

  async connect(c: ChannelDocument): Promise<ConnectResult> {
    const instanceName = `whatsapp_${c.merchantId}_${c.id}`;
    await this.evo.deleteInstance(instanceName).catch(() => undefined);
  
    const token = uuidv4();
    const { qr, instanceId } = await this.evo.startSession(instanceName, token);
  
    // اضبط Webhook لواتساب QR على مسارنا
    const rawBase = this.config.get('PUBLIC_WEBHOOK_BASE') || '';
    const base = rawBase.replace(/\/+$/, '');
    const hooksBase = /\/webhooks$/i.test(base) ? base : `${base}/webhooks`;
    const webhookUrl = `${hooksBase}/whatsapp_qr/${c.id}`;
    await this.evo.setWebhook(instanceName, webhookUrl, ['MESSAGES_UPSERT'], true, true);
  
    // خزّن
    c.sessionId = instanceName;
    c.instanceId = instanceId;
    c.qr = qr;
    c.webhookUrl = webhookUrl;
    c.accessTokenEnc = encryptSecret(token);
    c.enabled = true;
    c.status = ChannelStatus.PENDING;
    await c.save();
  
    // محاولة فورية لقراءة الحالة وتحديثها
    try {
      const inst = await this.evo.getStatus(instanceName);
      const mapped = mapEvoStatus(inst);
      if (mapped && mapped !== c.status) {
        c.status = mapped;
        if (mapped === ChannelStatus.CONNECTED) c.qr = undefined;
        await c.save();
      }
    } catch {}
  
    return { mode: 'qr', qr, webhookUrl };
  }

  async disconnect(c: ChannelDocument): Promise<void> {
    if (c.sessionId) {
      await this.evo.deleteInstance(c.sessionId).catch(() => undefined);
    }
    c.enabled = false;
    c.status = ChannelStatus.DISCONNECTED;
    await c.save();
  }

  async refresh(c: ChannelDocument): Promise<void> {
    // مستقبلاً: إعادة ضبط الـ webhook لو لزم
    return;
  }

  async getStatus(c: ChannelDocument): Promise<Status> {
    if (!c.sessionId) return { status: ChannelStatus.DISCONNECTED };
    try {
      const inst = await this.evo.getStatus(c.sessionId);
      const mapped = mapEvoStatus(inst);
      // لو تغيّرت الحالة، خزّنها وامسح الـ QR عند الاتصال
      if (mapped && mapped !== c.status) {
        c.status = mapped;
        if (mapped === ChannelStatus.CONNECTED) c.qr = undefined;
        await c.save();
      }
      return { status: mapped ?? c.status, details: inst };
    } catch {
      return { status: c.status };
    }
  }

  async sendMessage(c: ChannelDocument, to: string, text: string) {
    if (!c.sessionId) throw new Error('WhatsApp QR not configured');
    await this.evo.sendMessage(c.sessionId, to, text);
  }

  async handleWebhook(): Promise<WebhookResult> {
    return { ok: true };
  }
}
