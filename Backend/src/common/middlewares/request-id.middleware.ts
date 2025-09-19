// src/common/middlewares/request-id.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { requestId?: string }, res: Response, next: Function) {
    const id = (req.headers['X-Request-Id'] as string) || randomUUID();
    req.requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  }
}
