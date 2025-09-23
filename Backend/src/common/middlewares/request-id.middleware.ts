// src/common/middlewares/request-id.middleware.ts
import { randomUUID } from 'crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';

import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(
    req: Request & { requestId?: string },
    res: Response,
    next: NextFunction,
  ): void {
    const id = (req.headers['x-request-id'] as string) || randomUUID();
    req.requestId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
