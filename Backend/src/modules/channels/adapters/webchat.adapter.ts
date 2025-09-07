// src/modules/channels/adapters/webchat.adapter.ts
import { Injectable } from '@nestjs/common';
import { ChannelAdapter, ConnectResult, Status, WebhookResult } from './channel-adapter';
import { ChannelDocument } from '../schemas/channel.schema';

@Injectable()
export class WebchatAdapter implements ChannelAdapter {
  async connect(c: ChannelDocument): Promise<ConnectResult> { c.enabled = true; c.status = 'connected' as any; await c.save(); return { mode: 'none' }; }
  async disconnect(c: ChannelDocument): Promise<void> { c.enabled = false; c.status = 'disconnected' as any; await c.save(); }
  async refresh(): Promise<void> { /* no-op */ }
  async getStatus(c: ChannelDocument): Promise<Status> { return { status: c.status, details: { widgetSettings: c.widgetSettings } }; }
  async sendMessage(): Promise<void> { /* handled by your WS gateway */ }
  async handleWebhook(): Promise<WebhookResult> { return { ok: true }; }
}