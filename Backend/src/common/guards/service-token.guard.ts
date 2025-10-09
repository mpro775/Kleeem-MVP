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
    this.token = t ?? 'REPLACE_WITH_TOKEN';
  }

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<
      Request & {
        headers: Request['headers'] & { authorization?: string | string[] };
      }
    >();

    // Handle authorization header - could be string or array
    let authHeader = req.headers?.authorization;
    if (Array.isArray(authHeader)) {
      // Take the last header if multiple are provided
      authHeader = authHeader[authHeader.length - 1];
    }

    if (!authHeader) {
      throw new UnauthorizedException('invalid service token');
    }

    // Extract token - support both Bearer prefix (case insensitive) and raw tokens
    let provided: string;
    const headerStr = String(authHeader).trim();

    // Normalize whitespace (replace tabs/newlines with spaces for easier parsing)
    const normalizedHeader = headerStr.replace(/[\t\n\r]/g, ' ');

    if (normalizedHeader.toLowerCase().startsWith('bearer ')) {
      // Extract everything after 'bearer ' and trim
      const afterBearer = normalizedHeader.slice(7);
      provided = afterBearer.trim();
    } else {
      // Accept raw token without Bearer prefix
      provided = headerStr;
    }

    if (!provided || !this.timingSafeEqual(provided, this.token)) {
      throw new UnauthorizedException('invalid service token');
    }
    return true;
  }

  private timingSafeEqual(a: string, b: string): boolean {
    // Handle null/undefined inputs
    if (a == null || b == null) {
      return false;
    }

    // Handle empty strings - return false for security
    if (a === '' || b === '') {
      return false;
    }

    try {
      const A = Buffer.from(a);
      const B = Buffer.from(b);
      return A.length === B.length && crypto.timingSafeEqual(A, B);
    } catch {
      // If Buffer.from fails, return false
      return false;
    }
  }
}
