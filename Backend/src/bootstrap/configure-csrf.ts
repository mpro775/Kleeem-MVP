// CSRF protection configuration
import cookieParserLib from 'cookie-parser';
import csurfLib from 'csurf';

import type { INestApplication } from '@nestjs/common';
import type { CookieOptions } from 'csurf';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// ✅ بدون any
const csurf: (options?: { cookie?: CookieOptions }) => RequestHandler =
  csurfLib as unknown as (options?: {
    cookie?: CookieOptions;
  }) => RequestHandler;

// عرف النوع للـ cookieParser
const cookieParser: (secret?: string) => RequestHandler = cookieParserLib as (
  secret?: string,
) => RequestHandler;

const CSRF_BYPASS_PREFIXES = ['/webhooks', '/docs'];
const CSRF_BYPASS_EXACT = ['/docs-json', '/health', '/metrics'];

function isCsrfBypassPath(pathname: string): boolean {
  return (
    CSRF_BYPASS_EXACT.includes(pathname) ||
    CSRF_BYPASS_PREFIXES.some((p) => pathname.startsWith(p))
  );
}

/** شكل الطلب عندما يضيف csurf الدالة csrfToken */
interface CsrfRequest extends Request {
  csrfToken(): string;
}

function hasCsrfToken(req: Request): req is CsrfRequest {
  return typeof (req as Partial<CsrfRequest>).csrfToken === 'function';
}

export function configureCsrf(app: INestApplication): void {
  const cookieSecret: string | undefined = process.env.COOKIE_SECRET;
  app.use(cookieParser(cookieSecret));

  const csrfMw: RequestHandler = csurf({
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  });

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const pathname = req.path ?? '';
    if (isCsrfBypassPath(pathname)) {
      next();
      return;
    }
    csrfMw(req, res, next);
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (hasCsrfToken(req)) {
      res.setHeader('X-CSRF-Token', req.csrfToken());
    }
    next();
  });
}
