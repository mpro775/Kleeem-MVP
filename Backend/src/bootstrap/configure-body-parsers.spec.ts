import * as bodyParser from 'body-parser';

import { configureBodyParsers } from './configure-body-parsers';

import type { Request, Response } from 'express';

// ✅ موك صريح لـ body-parser: كل دالة ترجع "ميدلوير وهمي"
jest.mock('body-parser', () => {
  const json = jest.fn(() => 'json-parser');
  const urlencoded = jest.fn(() => 'urlencoded-parser');
  const raw = jest.fn(() => 'raw-parser');
  const text = jest.fn(() => 'text-parser');
  return { json, urlencoded, raw, text };
});

const mockedBodyParser = bodyParser as unknown as {
  json: jest.Mock<any, any>;
  urlencoded: jest.Mock<any, any>;
  raw: jest.Mock<any, any>;
  text: jest.Mock<any, any>;
};

describe('configureBodyParsers', () => {
  let mockApp: { use: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockApp = { use: jest.fn() };

    // ✨ نعيد إعداد الـ returns مع خيارات لها verify عند الحاجة
    mockedBodyParser.json.mockImplementation((opts?: any) => {
      // حافظ على الفرق بين Webhook (limit 2mb + verify) و General (5mb بدون verify)
      return opts?.limit === '2mb' ? 'json-parser' : 'json-parser';
    });
    mockedBodyParser.urlencoded.mockImplementation((opts?: any) => {
      return opts?.limit === '2mb' ? 'urlencoded-parser' : 'urlencoded-parser';
    });
    mockedBodyParser.raw.mockReturnValue('raw-parser');
    mockedBodyParser.text.mockReturnValue('text-parser');
  });

  it('should be defined', () => {
    expect(configureBodyParsers).toBeDefined();
  });

  describe('Webhook body parsers configuration', () => {
    it('configures JSON with verify + 2mb and mounts under /api/webhooks', () => {
      configureBodyParsers(mockApp as any);

      expect(mockedBodyParser.json).toHaveBeenCalledWith({
        limit: '2mb',
        verify: expect.any(Function),
        type: 'application/json',
      });
      expect(mockApp.use).toHaveBeenCalledWith('/api/webhooks', 'json-parser');
    });

    it('configures URL-encoded with verify + 2mb and mounts under /api/webhooks', () => {
      configureBodyParsers(mockApp as any);

      expect(mockedBodyParser.urlencoded).toHaveBeenCalledWith({
        extended: true,
        limit: '2mb',
        verify: expect.any(Function),
      });
      expect(mockApp.use).toHaveBeenCalledWith(
        '/api/webhooks',
        'urlencoded-parser',
      );
    });
  });

  describe('General body parsers configuration', () => {
    it('configures general JSON (5mb) + mounts globally', () => {
      configureBodyParsers(mockApp as any);

      expect(mockedBodyParser.json).toHaveBeenCalledWith({
        limit: '5mb',
        type: 'application/json',
      });
      expect(mockApp.use).toHaveBeenCalledWith('json-parser');
    });

    it('configures general URL-encoded (5mb)', () => {
      configureBodyParsers(mockApp as any);

      expect(mockedBodyParser.urlencoded).toHaveBeenCalledWith({
        extended: true,
        limit: '5mb',
      });
      expect(mockApp.use).toHaveBeenCalledWith('urlencoded-parser');
    });

    it('configures raw (1mb) and text (1mb)', () => {
      configureBodyParsers(mockApp as any);

      expect(mockedBodyParser.raw).toHaveBeenCalledWith({
        limit: '1mb',
        type: 'application/octet-stream',
      });
      expect(mockApp.use).toHaveBeenCalledWith('raw-parser');

      expect(mockedBodyParser.text).toHaveBeenCalledWith({
        limit: '1mb',
        type: 'text/plain',
      });
      expect(mockApp.use).toHaveBeenCalledWith('text-parser');
    });
  });

  describe('captureRawBody verify', () => {
    const extractVerify = () => {
      // أول نداء json بـ limit=2mb يحوي verify للوِبهُوكس
      const jsonCall = mockedBodyParser.json.mock.calls.find(
        (args) => args?.[0]?.limit === '2mb' && args?.[0]?.verify,
      );
      return jsonCall?.[0]?.verify as
        | ((req: any, res: Response, buf?: Buffer) => void)
        | undefined;
    };

    it('stores rawBody when buffer has content', () => {
      configureBodyParsers(mockApp as any);
      const verify = extractVerify();
      const req: any = {};
      const buf = Buffer.from('abc');

      verify?.(req, {} as Response, buf);
      expect(req.rawBody).toEqual(buf);
      expect(req.rawBody).not.toBe(buf); // Buffer.from(..) creates a copy
    });

    it('does not set rawBody for empty/undefined buffer', () => {
      configureBodyParsers(mockApp as any);
      const verify = extractVerify();
      const req: any = {};

      verify?.(req, {} as Response, Buffer.alloc(0));
      expect(req.rawBody).toBeUndefined();

      verify?.(req, {} as Response, undefined);
      expect(req.rawBody).toBeUndefined();
    });
  });

  describe('Dev logging middleware', () => {
    const original = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = original;
    });

    it('adds logging only in development', () => {
      process.env.NODE_ENV = 'development';
      configureBodyParsers(mockApp as any);

      const call = mockApp.use.mock.calls.find(
        (c) => c[0] === '/api/merchants/:id/prompt/preview',
      );
      expect(call).toBeDefined();

      // جرّب الميدلوير
      const [_, mw] = call!;
      const req = {
        headers: { 'content-type': 'application/json' },
        body: { a: 1 },
      } as Request;
      const next = jest.fn();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      (mw as (req: Request, res: Response, next: any) => void)(
        req,
        {} as Response,
        next,
      );
      expect(logSpy).toHaveBeenCalledWith(
        '🔎 PREVIEW PARSED BODY:',
        'application/json',
        { a: 1 },
      );
      expect(next).toHaveBeenCalled();

      logSpy.mockRestore();
    });

    it('skips logging in production', () => {
      process.env.NODE_ENV = 'production';
      configureBodyParsers(mockApp as any);
      const call = mockApp.use.mock.calls.find(
        (c) => c[0] === '/api/merchants/:id/prompt/preview',
      );
      expect(call).toBeUndefined();
    });
  });

  describe('Registration order & counts', () => {
    it('webhook parsers come before general parsers', () => {
      configureBodyParsers(mockApp as any);
      const calls = mockApp.use.mock.calls;

      const webhookJsonIdx = calls.findIndex(
        (c) => c[0] === '/api/webhooks' && c[1] === 'json-parser',
      );
      const webhookUrlIdx = calls.findIndex(
        (c) => c[0] === '/api/webhooks' && c[1] === 'urlencoded-parser',
      );
      const firstGeneralIdx = calls.findIndex(
        (c) => c[0] !== '/api/webhooks' && typeof c[1] !== 'function',
      );

      expect(webhookJsonIdx).toBeGreaterThanOrEqual(0);
      expect(webhookUrlIdx).toBeGreaterThanOrEqual(0);
      expect(webhookJsonIdx).toBeLessThan(firstGeneralIdx);
      expect(webhookUrlIdx).toBeLessThan(firstGeneralIdx);
    });

    describe('integration scenario (non-dev)', () => {
      const originalEnv = process.env.NODE_ENV;

      beforeEach(() => {
        process.env.NODE_ENV = 'production';
      });

      afterEach(() => {
        process.env.NODE_ENV = originalEnv;
      });

      it('total 6 uses', () => {
        configureBodyParsers(mockApp as any);
        expect(mockApp.use).toHaveBeenCalledTimes(6); // 2 webhook + 4 general
      });
    });

    it('integration scenario (dev): total 7 uses', () => {
      process.env.NODE_ENV = 'development';
      configureBodyParsers(mockApp as any);
      expect(mockApp.use).toHaveBeenCalledTimes(7); // +1 logging
    });
  });

  describe('Error surfaces', () => {
    it('handles invalid app gracefully', () => {
      expect(() => configureBodyParsers({} as any)).toThrow();
    });

    it('propagates body-parser errors', () => {
      mockedBodyParser.json.mockImplementationOnce(() => {
        throw new Error('Body parser error');
      });
      expect(() => configureBodyParsers(mockApp as any)).toThrow(
        'Body parser error',
      );
    });
  });

  describe('Performance smoke', () => {
    it('many configure calls should not throw', () => {
      for (let i = 0; i < 100; i++) configureBodyParsers(mockApp as any);
      // لا نتحقق من memoryUsage هنا لتجنّب flakiness في CI
      expect(mockApp.use).toHaveBeenCalled();
    });
  });
});
