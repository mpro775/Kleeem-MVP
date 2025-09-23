// src/modules/channels/adapters/webchat.adapter.ts
import { Injectable } from '@nestjs/common';

import { ChannelDocument, ChannelStatus } from '../schemas/channel.schema';

import {
  ChannelAdapter,
  ConnectResult,
  Status,
  WebhookResult,
} from './channel-adapter';

@Injectable()
export class WebchatAdapter implements ChannelAdapter {
  async connect(c: ChannelDocument): Promise<ConnectResult> {
    c.enabled = true;
    c.status = 'connected' as ChannelStatus;
    await c.save();
    return { mode: 'none' };
  }
  async disconnect(c: ChannelDocument): Promise<void> {
    c.enabled = false;
    c.status = 'disconnected' as ChannelStatus;
    await c.save();
  }
  async refresh(): Promise<void> {
    /* no-op */
  }
  getStatus(c: ChannelDocument): Promise<Status> {
    return Promise.resolve({
      status: c.status,
      details: { widgetSettings: c.widgetSettings },
    });
  }
  async sendMessage(): Promise<void> {
    /* handled by your WS gateway */
  }
  handleWebhook(): Promise<WebhookResult> {
    return Promise.resolve({ ok: true });
  }
}
