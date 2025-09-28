import * as crypto from 'crypto';

import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import axios from 'axios';
import { MS_PER_SECOND } from 'src/common/constants/common';
const TIMEOUTFOR_N8N = 8000;
@Injectable()
export class N8nForwarderService {
  private readonly logger = new Logger(N8nForwarderService.name);
  private readonly webhookBase =
    process.env.N8N_INTERNAL_WEBHOOK_BASE || 'http://kaleem-n8n:5678/webhook';
  private readonly secret = process.env.N8N_WEBHOOK_SECRET!;

  async forward(merchantId: string, payload: unknown): Promise<void> {
    if (!this.secret) {
      throw new InternalServerErrorException(
        'N8N_WEBHOOK_SECRET not configured',
      );
    }
    const ts = Math.floor(Date.now() / MS_PER_SECOND);
    const nonce = crypto.randomUUID();

    const raw = JSON.stringify(payload ?? {});
    const base = `${ts}.${raw}`;
    const sig =
      'sha256=' +
      crypto.createHmac('sha256', this.secret).update(base).digest('hex');

    const url = `${this.webhookBase}/ai-agent-${merchantId}`;

    await axios
      .post(url, raw, {
        headers: {
          'Content-Type': 'application/json',
          'X-Kaleem-Timestamp': String(ts),
          'X-Kaleem-Nonce': nonce,
          'X-Kaleem-Signature': sig,
        },
        timeout: TIMEOUTFOR_N8N,
      })
      .catch((e: unknown) => {
        this.logger.error('forward to n8n failed', {
          url,
          msg: e instanceof Error ? e.message : String(e),
          data: (e as { response?: { data?: unknown } })?.response?.data,
        });
        throw e;
      });
  }
}
