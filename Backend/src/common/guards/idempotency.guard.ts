import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ConflictException,
} from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

import type { Request } from 'express';

const IDENPOTENCY_KEY_MIN_LENGTH = 16;

@Injectable()
export class IdempotencyGuard implements CanActivate {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<
      Request & {
        headers: Request['headers'] & {
          'idempotency-key'?: string | string[];
        };
      }
    >();
    const key = String(req.headers['idempotency-key'] || '');

    if (!key || key.length < IDENPOTENCY_KEY_MIN_LENGTH) return true;

    const rkey = `idemp:${key}`;
    const ok = await this.redis.set(rkey, '1', 'EX', 60 * 60 * 24, 'NX');
    if (ok === null) {
      throw new ConflictException('duplicate idempotency-key');
    }
    return true;
  }
}
