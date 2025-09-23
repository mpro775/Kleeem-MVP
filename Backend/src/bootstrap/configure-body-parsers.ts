// Body parser configuration
import * as bodyParser from 'body-parser';

import type { INestApplication } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

export function configureBodyParsers(app: INestApplication): void {
  const captureRawBody = (
    req: Request & { rawBody?: Buffer },
    _res: Response,
    buf: Buffer,
  ) => {
    if (buf?.length) req.rawBody = Buffer.from(buf);
  };

  // webhooks أولاً (raw + حدود صغيرة)
  app.use(
    '/api/webhooks',
    bodyParser.json({
      limit: '2mb',
      verify: captureRawBody,
      type: 'application/json',
    }),
  );
  app.use(
    '/api/webhooks',
    bodyParser.urlencoded({
      extended: true,
      limit: '2mb',
      verify: captureRawBody,
    }),
  );

  // بقية المسارات
  app.use(bodyParser.json({ limit: '5mb', type: 'application/json' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
  app.use(bodyParser.raw({ limit: '1mb', type: 'application/octet-stream' }));
  app.use(bodyParser.text({ limit: '1mb', type: 'text/plain' }));

  if (process.env.NODE_ENV !== 'production') {
    app.use(
      '/api/merchants/:id/prompt/preview',
      (req: Request, _res: Response, next: NextFunction) => {
        // eslint-disable-next-line no-console
        console.log(
          '🔎 PREVIEW PARSED BODY:',
          req.headers['content-type'],
          req.body,
        );
        next();
      },
    );
  }
}
