// src/common/filters/ws-exceptions.filter.ts

// external (alphabetized)
import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

import type { Emittable } from './typs';

// -----------------------------------------------------------------------------

function isEmittable(v: unknown): v is Emittable {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Emittable).emit === 'function'
  );
}

// -----------------------------------------------------------------------------

/** فلتر أخطاء الويب سوكِت: يرسل حدث error موحّد للعميل */
@Catch(WsException)
export class WsAllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost): void {
    const rawClient: unknown = host.switchToWs().getClient();
    const rawError: unknown = exception.getError();

    const payload: { code: string; message?: unknown } =
      typeof rawError === 'string'
        ? { code: 'WS_ERROR', message: rawError }
        : {
            code: 'WS_ERROR',
            message: (rawError as Record<string, unknown>)?.message,
          };

    if (isEmittable(rawClient)) {
      try {
        rawClient.emit('error', payload);
      } catch {
        // ignore
      }
    }
  }
}
