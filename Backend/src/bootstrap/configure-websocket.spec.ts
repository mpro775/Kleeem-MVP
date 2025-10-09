// src/bootstrap/configure-websocket.spec.ts
import { IoAdapter } from '@nestjs/platform-socket.io';

import { corsOptions } from '../common/config/cors.config';
import {
  PING_TIMEOUT,
  PING_INTERVAL,
  UPGRADE_TIMEOUT,
  MAX_HTTP_BUFFER_SIZE,
} from '../common/constants/common';

import { configureWebsocket } from './configure-websocket';

// ملاحظة مهمة:
// لا نعمل jest.mock لـ @nestjs/platform-socket.io بالكامل
// لأننا نريد استخدام الـ prototype الحقيقي وعمل spy على createIOServer.
// سنعمل spy لاحقًا ونعيد قيمة وهمية لتجنب تنفيذ داخليات Socket.IO.

jest.mock('../common/config/cors.config', () => ({
  corsOptions: {
    origin: true,
    methods: ['GET', 'POST'],
    allowedHeaders: ['*'],
    credentials: true,
    maxAge: 3600,
  },
}));

jest.mock('../common/constants/common', () => ({
  PING_TIMEOUT: 60_000,
  PING_INTERVAL: 25_000,
  UPGRADE_TIMEOUT: 10_000,
  MAX_HTTP_BUFFER_SIZE: 1_000_000,
}));

type AnyAdapter = InstanceType<typeof IoAdapter> & Record<string, any>;

describe('configureWebsocket / WsAdapter', () => {
  let app: { useWebSocketAdapter: jest.Mock };

  beforeEach(() => {
    app = {
      useWebSocketAdapter: jest.fn(),
    };
    jest.clearAllMocks();
  });

  // -------- configureWebsocket: basic registration --------
  it('should be defined', () => {
    expect(configureWebsocket).toBeDefined();
  });

  it('registers a WebSocket adapter on the Nest app', () => {
    configureWebsocket(app as any);
    expect(app.useWebSocketAdapter).toHaveBeenCalledTimes(1);
    const adapterInstance = app.useWebSocketAdapter.mock.calls[0][0];
    expect(adapterInstance).toBeInstanceOf(IoAdapter);
  });

  it('does not throw when called with a valid app shape', () => {
    expect(() => configureWebsocket(app as any)).not.toThrow();
  });

  // -------- WsAdapter: options merge & behavior (by calling createIOServer manually) --------
  describe('WsAdapter options', () => {
    let adapter: AnyAdapter;
    let superSpy: jest.SpyInstance;

    beforeEach(() => {
      configureWebsocket(app as any);
      adapter = app.useWebSocketAdapter.mock.calls[0][0] as AnyAdapter;

      // نجعل super.createIOServer تُعيد خادماً وهمياً ونجمع الاستدعاءات
      superSpy = jest
        .spyOn(IoAdapter.prototype as any, 'createIOServer')
        .mockReturnValue({ io: 'server' });
    });

    afterEach(() => {
      superSpy.mockRestore();
    });

    function callCreateAndGetOptions(overrides?: object) {
      // نستدعي createIOServer ليفعِّل دمج الخيارات داخل WsAdapter
      adapter.createIOServer(0, overrides);
      expect(superSpy).toHaveBeenCalledTimes(1);
      const call = superSpy.mock.calls[0];
      const passedOptions = call[1] as Record<string, any>;
      return { call, passedOptions };
    }

    it('sets correct base path and disables client serving & EIO3', () => {
      const { passedOptions } = callCreateAndGetOptions();
      expect(passedOptions.path).toBe('/api/chat');
      expect(passedOptions.serveClient).toBe(false);
      expect(passedOptions.allowEIO3).toBe(false);
    });

    it('applies ping/timeout/max buffer constants', () => {
      const { passedOptions } = callCreateAndGetOptions();
      expect(passedOptions.pingTimeout).toBe(PING_TIMEOUT);
      expect(passedOptions.pingInterval).toBe(PING_INTERVAL);
      expect(passedOptions.upgradeTimeout).toBe(UPGRADE_TIMEOUT);
      expect(passedOptions.maxHttpBufferSize).toBe(MAX_HTTP_BUFFER_SIZE);
    });

    it('configures CORS from corsOptions (origin=true as function handled later)', () => {
      const { passedOptions } = callCreateAndGetOptions();
      expect(passedOptions.cors).toEqual(
        expect.objectContaining({
          origin: true,
          methods: ['GET', 'POST'],
          allowedHeaders: ['*'],
          credentials: true,
          maxAge: 3600,
        }),
      );
    });

    it('merges custom overrides on top of defaults', () => {
      const { passedOptions } = callCreateAndGetOptions({
        path: '/custom',
        serveClient: true,
        cors: { origin: 'https://example.com' },
      });

      expect(passedOptions.path).toBe('/custom');
      expect(passedOptions.serveClient).toBe(true);
      expect(passedOptions.cors.origin).toBe('https://example.com');
    });

    it('exposes allowRequest function', () => {
      const { passedOptions } = callCreateAndGetOptions();
      expect(typeof passedOptions.allowRequest).toBe('function');
    });
  });

  // -------- Origin validation via allowRequest --------
  describe('Origin validation (allowRequest)', () => {
    let adapter: AnyAdapter;
    let superSpy: jest.SpyInstance;
    let getOptions: () => any;

    beforeEach(() => {
      configureWebsocket(app as any);
      adapter = app.useWebSocketAdapter.mock.calls[0][0] as AnyAdapter;

      superSpy = jest
        .spyOn(IoAdapter.prototype as any, 'createIOServer')
        .mockReturnValue({ io: 'server' });

      getOptions = () => {
        adapter.createIOServer(0);
        const call = superSpy.mock.calls[0];
        return call[1];
      };
    });

    afterEach(() => {
      superSpy.mockRestore();
    });

    it('when corsOptions.origin is a function: uses isOriginFnAllowed result (allowed)', async () => {
      const originFn = jest.fn((origin: string, cb: any) =>
        cb(undefined, true),
      );

      // عدّل corsOptions.origin مؤقتًا
      (corsOptions as any).origin = originFn;

      const spyAllowed = jest
        .spyOn(adapter as any, 'isOriginFnAllowed')
        .mockResolvedValue(true);

      const opts = getOptions();
      const cb = jest.fn();
      await opts.allowRequest({ headers: { origin: 'https://ok.com' } }, cb);

      expect(spyAllowed).toHaveBeenCalledWith('https://ok.com', originFn);
      expect(cb).toHaveBeenCalledWith(undefined, true);
    });

    it('when corsOptions.origin is a function: uses isOriginFnAllowed result (rejected)', async () => {
      const originFn = jest.fn((origin: string, cb: any) =>
        cb('blocked', false),
      );
      (corsOptions as any).origin = originFn;

      jest.spyOn(adapter as any, 'isOriginFnAllowed').mockResolvedValue(false);

      const opts = getOptions();
      const cb = jest.fn();
      await opts.allowRequest({ headers: { origin: 'https://bad.com' } }, cb);

      // ملاحظة: داخل WsAdapter نستدعي callback(undefined, allowed)
      // لأن القرار النهائي يُبنى على نتيجة isOriginFnAllowed
      expect(cb).toHaveBeenCalledWith(undefined, false);
    });

    it('when corsOptions.origin is not a function: allows request by default', () => {
      (corsOptions as any).origin = true;

      const opts = getOptions();
      const cb = jest.fn();
      opts.allowRequest({ headers: { origin: 'https://x.com' } }, cb);

      expect(cb).toHaveBeenCalledWith(undefined, true);
    });

    it('handles requests without origin header (function case)', async () => {
      const originFn = jest.fn();
      (corsOptions as any).origin = originFn;

      const spyAllowed = jest
        .spyOn(adapter as any, 'isOriginFnAllowed')
        .mockResolvedValue(false);

      const opts = getOptions();
      const cb = jest.fn();
      await opts.allowRequest({ headers: {} }, cb);

      expect(spyAllowed).toHaveBeenCalledWith(undefined, originFn);
      expect(cb).toHaveBeenCalledWith(undefined, false);
    });
  });

  // -------- isOriginFnAllowed (private) --------
  describe('isOriginFnAllowed (private) behavior', () => {
    let adapter: AnyAdapter;

    beforeEach(() => {
      configureWebsocket(app as any);
      adapter = app.useWebSocketAdapter.mock.calls[0][0] as AnyAdapter;
    });

    it('resolves true when originFn allows', async () => {
      const originFn = (origin: string, cb: any) => cb(undefined, true);
      const result = await (adapter as any).isOriginFnAllowed(
        'https://ok.com',
        originFn,
      );
      expect(result).toBe(true);
    });

    it('resolves false when originFn rejects', async () => {
      const originFn = (origin: string, cb: any) => cb('blocked', false);
      const result = await (adapter as any).isOriginFnAllowed(
        'https://bad.com',
        originFn,
      );
      expect(result).toBe(false);
    });

    it('resolves false when origin is undefined (and does not call originFn)', async () => {
      const originFn = jest.fn();
      const result = await (adapter as any).isOriginFnAllowed(
        undefined,
        originFn,
      );
      expect(result).toBe(false);
      expect(originFn).not.toHaveBeenCalled();
    });

    it('resolves false when originFn throws', async () => {
      const originFn = () => {
        throw new Error('boom');
      };
      const result = await (adapter as any).isOriginFnAllowed(
        'https://x.com',
        originFn as any,
      );
      expect(result).toBe(false);
    });
  });

  // -------- CORS fallbacks & tweaks --------
  describe('CORS fallbacks', () => {
    let adapter: AnyAdapter;
    let superSpy: jest.SpyInstance;

    beforeEach(() => {
      configureWebsocket(app as any);
      adapter = app.useWebSocketAdapter.mock.calls[0][0] as AnyAdapter;

      superSpy = jest
        .spyOn(IoAdapter.prototype as any, 'createIOServer')
        .mockReturnValue({ io: 'server' });
    });

    afterEach(() => {
      superSpy.mockRestore();
    });

    it('falls back to default methods ["GET","POST"] when methods undefined', () => {
      (corsOptions as any).methods = undefined;
      adapter.createIOServer(0);
      const options = superSpy.mock.calls[0][1];
      expect(options.cors.methods).toEqual(['GET', 'POST']);
    });

    it('defaults credentials=true when undefined', () => {
      (corsOptions as any).credentials = undefined;
      adapter.createIOServer(0);
      const options = superSpy.mock.calls[0][1];
      expect(options.cors.credentials).toBe(true);
    });

    it('keeps allowedHeaders and maxAge if provided', () => {
      (corsOptions as any).allowedHeaders = ['authorization', 'content-type'];
      (corsOptions as any).maxAge = 7200;

      adapter.createIOServer(0);
      const options = superSpy.mock.calls[0][1];

      expect(options.cors.allowedHeaders).toEqual([
        'authorization',
        'content-type',
      ]);
      expect(options.cors.maxAge).toBe(7200);
    });
  });

  // -------- Repeated configuration (no leaks) --------
  describe('Multiple registrations / performance sanity', () => {
    it('can be called multiple times without throwing', () => {
      for (let i = 0; i < 5; i++) {
        expect(() => configureWebsocket(app as any)).not.toThrow();
      }
      expect(app.useWebSocketAdapter).toHaveBeenCalledTimes(5);
    });

    it('heap usage should not grow absurdly for many calls (smoke check)', () => {
      const start = process.memoryUsage().heapUsed;
      for (let i = 0; i < 200; i++) configureWebsocket(app as any);
      const end = process.memoryUsage().heapUsed;
      const diff = end - start;
      expect(diff).toBeLessThan(15 * 1024 * 1024); // < 15MB نمو تقريبي
    });
  });
});
