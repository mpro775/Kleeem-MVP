import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

function redact(
  obj: unknown,
  keys: string[] = [
    'access_token',
    'token',
    'secret',
    'signature',
    'appSecret',
    'verifyToken',
  ],
): unknown {
  try {
    const s = JSON.stringify(obj, (_k, v) => {
      if (typeof v === 'string' && v.length > 500) return v.slice(0, 500) + '…';
      return v as unknown;
    });
    const redacted = keys.reduce(
      (acc, k) =>
        acc.replace(
          new RegExp(`("${k}"\\s*:\\s*)"([^"]+)"`, 'gi'),
          `$1"[REDACTED]"`,
        ),
      s,
    );
    return JSON.parse(redacted);
  } catch {
    return { note: 'unserializable' };
  }
}

@Injectable()
export class WebhookLoggingInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType<'http'>() !== 'http') return next.handle();
    const req = ctx.switchToHttp().getRequest<Request>();

    const started = Date.now();
    const meta = {
      path: req.path,
      method: req.method,
      provider: (req.headers['x-hub-signature-256'] as string)
        ? 'whatsapp_cloud'
        : (req.headers['x-telegram-bot-api-secret-token'] as string)
          ? 'telegram'
          : (req.headers['x-evolution-apikey'] as string) ||
              (req.headers['apikey'] as string)
            ? 'whatsapp_qr'
            : 'unknown',
      channelId: (req.params as { channelId?: string })?.channelId,
      merchantId:
        (req as unknown as { merchantId?: string }).merchantId || undefined,
      ip: req.ip as string,
      ua: req.headers['user-agent'] as string,
      // لا تسجل الجسم كامل — خذ مقتطفًا بعد تنقيح الحساسيات
      bodyPreview: redact((req as unknown as { body?: unknown }).body),
      headersPreview: redact({
        // التزم بالحد الأدنى؛ لا تسجل Authorization
        'content-type': req.headers['content-type'] as string,
        'x-hub-signature-256': (req.headers['x-hub-signature-256'] as string)
          ? '[PRESENT]'
          : undefined,
        'x-telegram-bot-api-secret-token': (req.headers[
          'x-telegram-bot-api-secret-token'
        ] as string)
          ? '[PRESENT]'
          : undefined,
        'x-evolution-apikey': (req.headers['x-evolution-apikey'] as string)
          ? '[PRESENT]'
          : undefined,
        apikey: (req.headers['apikey'] as string) ? '[PRESENT]' : undefined,
      }),
    };

    // استخدم لوجر Nest الافتراضي أو أي Logger عندك
    // eslint-disable-next-line no-console
    console.info('WEBHOOK_REQ', meta);

    return next.handle().pipe(
      tap((resp) => {
        const ms = Date.now() - started;
        // eslint-disable-next-line no-console
        console.info('WEBHOOK_RES', {
          path: meta.path,
          status: ctx.switchToHttp().getResponse<Response>().statusCode,
          durationMs: ms,
          channelId: meta.channelId,
          provider: meta.provider,
          outcome:
            typeof resp === 'object' &&
            ((resp as Record<string, unknown>)?.status ||
              (resp as Record<string, unknown>)?.action)
              ? (resp as Record<string, unknown>)
              : undefined,
        });
      }),
    );
  }
}
