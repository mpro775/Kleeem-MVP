// CSRF protection configuration
import csurfLib from '@dr.pogodin/csurf';
import cookieParserLib from 'cookie-parser';

import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

type CsrfOptions = {
  cookie?:
    | boolean
    | {
        httpOnly?: boolean;
        sameSite?: 'strict' | 'lax' | 'none';
        secure?: boolean;
        path?: string;
        domain?: string;
        maxAge?: number;
      };
};

// ✅ بدون any
const csurf: (options?: CsrfOptions) => RequestHandler =
  csurfLib as unknown as (options?: CsrfOptions) => RequestHandler;

// عرف النوع للـ cookieParser
const cookieParser: (secret?: string) => RequestHandler = cookieParserLib as (
  secret?: string,
) => RequestHandler;

const CSRF_BYPASS_PREFIXES = ['/webhooks', '/docs', '/integrations/n8n'];
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
      // بإمكانك إضافة path/domain/maxAge هنا لأن النوع صار مضبوط
      // path: '/',
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
