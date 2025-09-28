import * as crypto from 'crypto';

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ServiceTokenGuard implements CanActivate {
  private readonly token: string;

  constructor() {
    const t = process.env.N8N_SERVICE_TOKEN;
    this.token = t || 'REPLACE_WITH_TOKEN';
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & {
        headers: Request['headers'] & { authorization?: string | string[] };
      }
    >();
    const header = String(req.headers?.authorization || '');
    const provided = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!provided || !this.timingSafeEqual(provided, this.token)) {
      throw new UnauthorizedException('invalid service token');
    }
    return true;
  }

  private timingSafeEqual(a: string, b: string): boolean {
    const A = Buffer.from(a);
    const B = Buffer.from(b);
    return A.length === B.length && crypto.timingSafeEqual(A, B);
  }
}
