// src/workers/ai-bridge.consumer.ts
import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosError } from 'axios';
@Injectable()
export class AiBridgeConsumer {
  private readonly logger = new Logger(AiBridgeConsumer.name);
  private readonly n8nBase = (
    process.env.N8N_BASE_URL ||
    process.env.N8N_BASE ||
    ''
  ).replace(/\/+$/, '');
  private readonly workerToken = process.env.WORKER_TOKEN!;

  async onChatIncoming(msg: {
    merchantId: string;
    sessionId: string;
    channel: 'whatsapp' | 'telegram' | 'webchat';
    text: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const pathTpl =
      process.env.N8N_INCOMING_PATH || '/webhook/ai-agent-{merchantId}';
    const url = this.n8nBase + pathTpl.replace('{merchantId}', msg.merchantId);

    try {
      await axios.post(url, msg, {
        headers: { 'X-Worker-Token': this.workerToken },
      });
    } catch (e: unknown) {
      const error = e as AxiosError;
      this.logger.error(
        'Failed to call n8n',
        error?.response?.data || error?.message || 'Unknown error',
      );
    }
  }
}
