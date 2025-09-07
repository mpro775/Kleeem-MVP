// src/common/filters/ws-exceptions.filter.ts
import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';

/** فلتر أخطاء الويب سوكِت: يرسل حدث error موحّد للعميل */
@Catch(WsException)
export class WsAllExceptionsFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient();
    const e = exception.getError();
    const payload = typeof e === 'string' ? { code: 'WS_ERROR', message: e } : e;
    try {
      client.emit('error', payload);
    } catch {
      // ignore
    }
  }
}
