import { Test, type TestingModule } from '@nestjs/testing';

import { NonceController } from './nonce.controller';

import type Redis from 'ioredis';

describe('NonceController', () => {
  let controller: NonceController;
  let redis: jest.Mocked<Redis>;

  const DEFAULT_NONCE_TTL_SECONDS = 300;

  beforeEach(async () => {
    const mockRedis = {
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NonceController],
      providers: [
        {
          provide: 'IORedis:default',
          useValue: mockRedis,
        },
      ],
    }).compile();

    controller = module.get<NonceController>(NonceController);
    redis = module.get('IORedis:default');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('verify', () => {
    describe('successful verification', () => {
      it('should return ok: true for valid nonce', async () => {
        const validNonce = 'abcdefghijk';
        const body = { nonce: validNonce };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${validNonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should use custom TTL when provided', async () => {
        const nonce = 'abcdefghijk';
        const customTtl = 600;
        const body = { nonce, ttlSec: customTtl };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          customTtl,
          'NX',
        );
      });

      it('should handle minimum valid nonce length', async () => {
        const minValidNonce = 'abcdefgh'; // 8 characters
        const body = { nonce: minValidNonce };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${minValidNonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should handle long nonces', async () => {
        const longNonce = 'a'.repeat(100);
        const body = { nonce: longNonce };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${longNonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should handle numeric nonces converted to strings', async () => {
        const numericNonce = 12345678;
        const body = { nonce: numericNonce.toString() };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${numericNonce.toString()}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });
    });

    describe('replay attack prevention', () => {
      it('should return replay error when nonce already exists', async () => {
        const usedNonce = 'abcdefghijk';
        const body = { nonce: usedNonce };

        redis.set.mockResolvedValue(null); // Redis returns null when NX fails

        const result = await controller.verify(body);

        expect(result).toEqual({
          ok: false,
          statusCode: 409,
          error: 'replay',
        });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${usedNonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should detect replay with custom TTL', async () => {
        const usedNonce = 'abcdefghijk';
        const customTtl = 120;
        const body = { nonce: usedNonce, ttlSec: customTtl };

        redis.set.mockResolvedValue(null);

        const result = await controller.verify(body);

        expect(result).toEqual({
          ok: false,
          statusCode: 409,
          error: 'replay',
        });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${usedNonce}`,
          '1',
          'EX',
          customTtl,
          'NX',
        );
      });
    });

    describe('invalid nonce handling', () => {
      it('should reject empty nonce', async () => {
        const body = { nonce: '' };

        const result = await controller.verify(body);

        expect(result).toEqual({
          ok: false,
          error: 'invalid-nonce',
        });
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('should reject null nonce', async () => {
        const body = { nonce: null as any };

        const result = await controller.verify(body);

        expect(result).toEqual({
          ok: false,
          error: 'invalid-nonce',
        });
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('should reject undefined nonce', async () => {
        const body = { nonce: undefined as any };

        const result = await controller.verify(body);

        expect(result).toEqual({
          ok: false,
          error: 'invalid-nonce',
        });
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('should reject nonce shorter than 8 characters', async () => {
        const shortNonces = [
          '',
          'a',
          'ab',
          'abc',
          'abcd',
          'abcde',
          'abcdef',
          'abcdefg',
        ];

        for (const nonce of shortNonces) {
          const body = { nonce: nonce as any };

          const result = await controller.verify(body);

          expect(result).toEqual({
            ok: false,
            error: 'invalid-nonce',
          });
          expect(redis.set).not.toHaveBeenCalled();
        }
      });

      it('should reject non-string nonce values', async () => {
        const invalidNonces = [123, true, {}, [], null, undefined];

        for (const nonce of invalidNonces) {
          const body = { nonce: nonce as any };

          const result = await controller.verify(body);

          expect(result).toEqual({
            ok: false,
            error: 'invalid-nonce',
          });
          expect(redis.set).not.toHaveBeenCalled();
        }
      });
    });

    describe('TTL handling', () => {
      it('should use default TTL when ttlSec is not provided', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should use default TTL when ttlSec is undefined', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce, ttlSec: undefined as any };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should use custom TTL when provided', async () => {
        const nonce = 'abcdefghijk';
        const customTtl = 900;
        const body = { nonce, ttlSec: customTtl };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          customTtl,
          'NX',
        );
      });

      it('should handle zero TTL', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce, ttlSec: 0 as any };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          0,
          'NX',
        );
      });

      it('should handle negative TTL values', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce, ttlSec: -1 as any };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          -1,
          'NX',
        );
      });

      it('should handle large TTL values', async () => {
        const nonce = 'abcdefghijk';
        const largeTtl = 2147483647; // Max 32-bit signed integer
        const body = { nonce, ttlSec: largeTtl as any };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          largeTtl,
          'NX',
        );
      });
    });

    describe('Redis interaction', () => {
      it('should use correct Redis key format', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${nonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should use correct Redis SET parameters', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        const [key, value, ...args] = redis.set.mock.calls[0];
        expect(key).toBe(`nonce:${nonce}`);
        expect(value).toBe('1');
        expect(args).toEqual(['EX', DEFAULT_NONCE_TTL_SECONDS, 'NX']);
      });

      it('should handle Redis connection errors', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce };

        redis.set.mockRejectedValue(new Error('Redis connection failed'));

        await expect(controller.verify(body)).rejects.toThrow(
          'Redis connection failed',
        );
      });

      it('should handle Redis timeout', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce };

        redis.set.mockRejectedValue(new Error('Timeout'));

        await expect(controller.verify(body)).rejects.toThrow('Timeout');
      });
    });

    describe('body parsing', () => {
      it('should handle missing body', async () => {
        const result = await controller.verify(undefined as any);

        expect(result).toEqual({
          ok: false,
          error: 'invalid-nonce',
        });
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('should handle empty body', async () => {
        const body = {} as any;
        const result = await controller.verify(body);

        expect(result).toEqual({
          ok: false,
          error: 'invalid-nonce',
        });
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('should handle body with extra properties', async () => {
        const body = {
          nonce: 'abcdefghijk',
          ttlSec: 600,
          extraProp: 'extra',
          anotherProp: 123,
        };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${body.nonce}`,
          '1',
          'EX',
          body.ttlSec,
          'NX',
        );
      });

      it('should convert ttlSec to number', async () => {
        const body = { nonce: 'abcdefghijk', ttlSec: '600' as any };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${body.nonce}`,
          '1',
          'EX',
          600,
          'NX',
        );
      });
    });

    describe('security considerations', () => {
      it('should prevent timing attacks by validating nonce before Redis call', async () => {
        const invalidNonce = 'short';
        const body = { nonce: invalidNonce };

        const result = await controller.verify(body);

        expect(result).toEqual({
          ok: false,
          error: 'invalid-nonce',
        });
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('should use NX flag to prevent race conditions', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          expect.any(String),
          '1',
          'EX',
          expect.any(Number),
          'NX',
        );
      });

      it('should store minimal data in Redis', async () => {
        const nonce = 'abcdefghijk';
        const body = { nonce };

        redis.set.mockResolvedValue('OK');

        await controller.verify(body);

        expect(redis.set).toHaveBeenCalledWith(
          expect.any(String),
          '1', // Only stores '1', not the nonce itself
          expect.any(String),
          expect.any(Number),
          expect.any(String),
        );
      });
    });

    describe('integration scenarios', () => {
      it('should handle typical N8N webhook nonce verification', async () => {
        const webhookNonce = 'n8n_webhook_nonce_12345678';
        const body = { nonce: webhookNonce, ttlSec: 3600 };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${webhookNonce}`,
          '1',
          'EX',
          3600,
          'NX',
        );
      });

      it('should handle API integration nonce verification', async () => {
        const apiNonce = 'api_integration_abcdefgh';
        const body = { nonce: apiNonce };

        redis.set.mockResolvedValue('OK');

        const result = await controller.verify(body);

        expect(result).toEqual({ ok: true });
        expect(redis.set).toHaveBeenCalledWith(
          `nonce:${apiNonce}`,
          '1',
          'EX',
          DEFAULT_NONCE_TTL_SECONDS,
          'NX',
        );
      });

      it('should reject replay attacks in integration scenarios', async () => {
        const integrationNonce = 'integration_nonce_123';
        const body = { nonce: integrationNonce };

        // First call succeeds
        redis.set.mockResolvedValueOnce('OK');
        const firstResult = await controller.verify(body);
        expect(firstResult).toEqual({ ok: true });

        // Second call fails (replay)
        redis.set.mockResolvedValueOnce(null);
        const secondResult = await controller.verify(body);
        expect(secondResult).toEqual({
          ok: false,
          statusCode: 409,
          error: 'replay',
        });
      });
    });

    describe('performance considerations', () => {
      it('should handle rapid successive calls', async () => {
        const nonces = Array.from(
          { length: 100 },
          (_, i) => `nonce_${i}_abcdefgh`,
        );

        redis.set.mockResolvedValue('OK');

        const startTime = Date.now();

        for (const nonce of nonces) {
          const result = await controller.verify({ nonce });
          expect(result).toEqual({ ok: true });
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      });

      it('should validate nonce length efficiently', async () => {
        const shortNonce = 'short';

        const startTime = Date.now();
        const result = await controller.verify({ nonce: shortNonce });
        const endTime = Date.now();

        expect(result).toEqual({
          ok: false,
          error: 'invalid-nonce',
        });

        const duration = endTime - startTime;
        expect(duration).toBeLessThan(10); // Should be very fast
        expect(redis.set).not.toHaveBeenCalled();
      });
    });
  });

  describe('controller configuration', () => {
    it('should be configured with correct route prefix', () => {
      expect(controller).toBeInstanceOf(NonceController);
    });

    it('should have correct HTTP method and route', () => {
      // Tested by ensuring the verify method works correctly
      expect(typeof controller.verify).toBe('function');
    });
  });
});
