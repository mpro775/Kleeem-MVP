// src/modules/channels/adapters/telegram.adapter.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { ChannelDocument, ChannelStatus } from '../schemas/channel.schema';
import { decryptSecret, encryptSecret } from '../utils/secrets.util';

import {
  ChannelAdapter,
  ConnectResult,
  Status,
  WebhookResult,
} from './channel-adapter';

@Injectable()
export class TelegramAdapter implements ChannelAdapter {
  private readonly logger = new Logger(TelegramAdapter.name);
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  async connect(
    c: ChannelDocument,
    payload?: { botToken?: string },
  ): Promise<ConnectResult> {
    // 1) جهّز الـ hook URL (التصحيح أعلاه)
    const rawBase = (this.config.get('PUBLIC_WEBHOOK_BASE') as string) || '';
    const base = rawBase.replace(/\/+$/, '');
    const hooksBase = /\/webhooks$/i.test(base) ? base : `${base}/webhooks`;
    const hookUrl = `${hooksBase}/telegram/${c.id}`;

    // 2) خذ التوكن: إمّا من الـ payload أو من السرّ المخزّن
    let token = (payload?.botToken || '').trim();
    if (!token && c.botTokenEnc) token = decryptSecret(c.botTokenEnc);
    token = token.replace(/^bot[:\s]*/i, ''); // لو المستخدم حاط "bot..."

    if (!token)
      throw new Error('botToken is required (none provided or stored)');

    // 3) setWebhook
    await firstValueFrom(
      this.http.get(`https://api.telegram.org/bot${token}/setWebhook`, {
        params: {
          url: hookUrl,
          secret_token: this.config.get('TELEGRAM_WEBHOOK_SECRET') as string,
          drop_pending_updates: true,
          allowed_updates: JSON.stringify(['message', 'edited_message']),
        },
      }),
    );

    // 4) خزّن/حدّث
    if (!c.botTokenEnc) c.botTokenEnc = encryptSecret(token);
    c.webhookUrl = hookUrl;
    c.enabled = true;
    c.status = 'connected' as ChannelStatus;
    await c.save();

    return { mode: 'webhook', webhookUrl: hookUrl };
  }
  async disconnect(
    c: ChannelDocument,
    mode: 'disable' | 'disconnect' | 'wipe' = 'disconnect',
  ): Promise<void> {
    try {
      if (c.botTokenEnc) {
        const token = decryptSecret(c.botTokenEnc);
        await firstValueFrom(
          this.http.get(`https://api.telegram.org/bot${token}/deleteWebhook`, {
            params: { drop_pending_updates: 'true' },
          }),
        );
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Telegram deleteWebhook failed: ${message}`);
    }
    c.status = 'disconnected' as ChannelStatus;
    c.enabled = false;
    if (mode === 'wipe') {
      c.botTokenEnc = undefined;
      c.webhookUrl = undefined;
    }
    await c.save();
  }

  async refresh(): Promise<void> {
    /* no-op for Telegram */
  }
  getStatus(c: ChannelDocument): Promise<Status> {
    return Promise.resolve({
      status: c.status,
      details: { webhookUrl: c.webhookUrl },
    });
  }
  async sendMessage(
    c: ChannelDocument,
    to: string,
    text: string,
  ): Promise<void> {
    const token = c.botTokenEnc ? decryptSecret(c.botTokenEnc) : undefined;
    if (!token) throw new Error('Telegram not configured');
    await firstValueFrom(
      this.http.post(`https://api.telegram.org/bot${token}/sendMessage`, {
        chat_id: to,
        text,
        // parse_mode: 'HTML', // لو تحب تدعم تنسيق
      }),
    );
  }
  handleWebhook(): Promise<WebhookResult> {
    return Promise.resolve({ ok: true });
  }
}
