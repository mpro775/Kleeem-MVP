import csurf, { type CsrfOptions } from '@dr.pogodin/csurf';
import cookieParser from 'cookie-parser';

import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

// -----------------------------------------------------------------------------

type CsrfRequest = Request & {
  /** تضيفها مكتبة csurf أثناء التنفيذ */
  csrfToken?: () => string;
  /** تضيفها cookie-parser */
  secret?: string;
};
const CSRF_BYPASS_PREFIXES = ['/webhooks', '/docs', '/integrations/n8n'];
const CSRF_BYPASS_EXACT = [
  '/docs-json',
  '/health',
  '/metrics',
  '/auth/register',
  '/auth/verify-email',
  '/auth/resend-verification',
];

function isPrefixBoundaryMatch(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true; // "/webhooks"
  if (pathname.startsWith(prefix + '/')) return true; // "/webhooks/..."
  return false; // يمنع "/webhooks_backup"
}

function isCsrfBypassPath(pathname: string): boolean {
  if (!pathname) return false;
  return (
    CSRF_BYPASS_EXACT.includes(pathname) ||
    CSRF_BYPASS_PREFIXES.some((p) => isPrefixBoundaryMatch(pathname, p))
  );
}

// -----------------------------------------------------------------------------

export function configureCsrf(app: INestApplication): void {
  // ✅ تأكد أن app صالح قبل أي استخدام
  const expressApp = app as unknown as {
    use?: (pathOrHandler: unknown, handler?: unknown) => void;
  };
  if (!expressApp.use || typeof expressApp.use !== 'function') {
    return;
  }

  const cookieSecret: string | undefined = process.env.COOKIE_SECRET;

  // ✅ إعداد cookie-parser (الـ secret اختياري)
  expressApp.use(cookieParser(cookieSecret));

  // ✅ إعداد خيارات CSRF
  const csrfOptions: CsrfOptions = {
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  };

  // ✅ إنشاء middleware
  const candidate = csurf(csrfOptions);
  const csrfMiddleware: RequestHandler =
    typeof candidate === 'function'
      ? (candidate as RequestHandler)
      : (_req: Request, _res: Response, next: NextFunction): void => next();

  // ✅ bypass middleware
  expressApp.use(
    '/api',
    (req: CsrfRequest, res: Response, next: NextFunction): void => {
      const pathname = req.path ?? '';
      if (isCsrfBypassPath(pathname)) {
        next();
      } else {
        csrfMiddleware(req, res, next);
      }
    },
  );

  // ✅ token injection middleware
  expressApp.use((req: Request, res: Response, next: NextFunction): void => {
    const r = req as CsrfRequest;
    const getToken = r.csrfToken;
    if (typeof getToken === 'function') {
      try {
        const token = getToken();
        res.setHeader('X-CSRF-Token', token);
      } catch {
        // تجاهل أخطاء csrfToken
      }
    }
    next();
  });
}
