// CSRF protection configuration
import cookieParser from 'cookie-parser';
import csurf from 'csurf';

import type { INestApplication } from '@nestjs/common';

export function configureCsrf(app: INestApplication): void {
  app.use(cookieParser(process.env.COOKIE_SECRET));
  const csrfMw = csurf({
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  });

  app.use('/api', (req, res, next) => {
    const path = req.path || '';
    if (
      path.startsWith('/webhooks') ||
      path.startsWith('/docs') ||
      path.startsWith('/docs-json') ||
      path === '/health' ||
      path === '/metrics'
    )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return next();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return (csrfMw as any)(req, res, next);
  });

  app.use((req: any, res, next) => {
    if (typeof req.csrfToken === 'function') {
      res.setHeader('X-CSRF-Token', req.csrfToken());
    }
    next();
  });
}
