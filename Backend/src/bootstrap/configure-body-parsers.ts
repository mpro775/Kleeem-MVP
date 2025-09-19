// Body parser configuration
import { INestApplication } from '@nestjs/common';
import * as bodyParser from 'body-parser';

export function configureBodyParsers(app: INestApplication): void {
  const captureRawBody = (req: any, _res: any, buf: Buffer) => {
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
    app.use('/api/merchants/:id/prompt/preview', (req, _res, next) => {
      // eslint-disable-next-line no-console
      console.log(
        '🔎 PREVIEW PARSED BODY:',
        req.headers['content-type'],
        req.body,
      );
      next();
    });
  }
}
