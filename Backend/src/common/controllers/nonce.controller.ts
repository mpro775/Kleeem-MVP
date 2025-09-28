import { Body, Controller, Post } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

const DEFAULT_NONCE_TTL_SECONDS = 300;

@Controller('integrations/n8n/nonce')
export class NonceController {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  @Post('verify')
  async verify(
    @Body() body: { nonce: string; ttlSec?: number },
  ): Promise<{ ok: boolean; error?: string; statusCode?: number }> {
    const nonce = String(body?.nonce || '');
    const ttl = Number(body?.ttlSec || DEFAULT_NONCE_TTL_SECONDS);
    if (!nonce || nonce.length < 8) {
      return { ok: false, error: 'invalid-nonce' };
    }
    const key = `nonce:${nonce}`;
    const ok = await this.redis.set(key, '1', 'EX', ttl, 'NX');
    if (ok === null) {
      return { ok: false, statusCode: 409, error: 'replay' };
    }
    return { ok: true };
  }
}
