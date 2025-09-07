// src/modules/channels/adapters/whatsapp-cloud.adapter.ts
import { Injectable, Logger } from '@nestjs/common';
import { ChannelAdapter, ConnectResult, Status, WebhookResult } from './channel-adapter';
import { ChannelDocument } from '../schemas/channel.schema';
import { encryptSecret, hashSecret } from '../utils/secrets.util';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppCloudAdapter implements ChannelAdapter {
  private readonly logger = new Logger(WhatsAppCloudAdapter.name);
  constructor(private readonly config: ConfigService) {}

  async connect(c: ChannelDocument, payload: { accessToken: string; phoneNumberId: string; wabaId?: string; appSecret?: string; verifyToken?: string; }): Promise<ConnectResult> {
    if (!payload?.accessToken || !payload?.phoneNumberId) throw new Error('accessToken & phoneNumberId required');
    c.accessTokenEnc = encryptSecret(payload.accessToken);
    c.phoneNumberId = payload.phoneNumberId;
    c.wabaId = payload.wabaId;
    c.appSecretEnc = payload.appSecret ? encryptSecret(payload.appSecret) : undefined;
    c.verifyTokenHash = payload.verifyToken ? hashSecret(payload.verifyToken) : undefined;
    const rawBase = this.config.get('PUBLIC_WEBHOOK_BASE') || '';
const base = rawBase.replace(/\/+$/, '');                 // شيل السلاشات الأخيرة
const hooksBase = /\/webhooks$/i.test(base) ? base : `${base}/webhooks`;
    const hookUrl = `${hooksBase}/whatsapp_cloud/${c.id}`;
    c.enabled = true; c.status = 'connected' as any;
    await c.save();
    return { mode: 'webhook', webhookUrl: hookUrl };
  }

  async disconnect(c: ChannelDocument, mode: 'disable'|'disconnect'|'wipe'): Promise<void> {
    c.enabled = false; c.status = 'disconnected' as any;
    if (mode === 'wipe') {
      c.accessTokenEnc = undefined as any; c.refreshTokenEnc = undefined as any; c.appSecretEnc = undefined as any; c.verifyTokenHash = undefined as any;
    }
    await c.save();
  }

  async refresh(): Promise<void> { /* implement token refresh if you use OAuth */ }
  async getStatus(c: ChannelDocument): Promise<Status> { return { status: c.status, details: { phoneNumberId: c.phoneNumberId } }; }
  async sendMessage(): Promise<void> { /* optional: call Graph API */ }
  async handleWebhook(): Promise<WebhookResult> { return { ok: true }; }
}