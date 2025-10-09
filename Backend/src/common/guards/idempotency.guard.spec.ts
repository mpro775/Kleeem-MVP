import { type ExecutionContext, ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';

import { IdempotencyGuard } from './idempotency.guard';

import type { Redis } from 'ioredis';

describe('IdempotencyGuard', () => {
  let guard: IdempotencyGuard;
  let redis: jest.Mocked<Redis>;

  beforeEach(async () => {
    const mockRedis = {
      set: jest.fn(),
    } as unknown as jest.Mocked<Redis>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdempotencyGuard,
        // ✅ التوكن الصحيح لاتصال Redis الافتراضي
        { provide: getRedisConnectionToken(), useValue: mockRedis },
      ],
    }).compile();

    guard = module.get<IdempotencyGuard>(IdempotencyGuard);
    redis = module.get<jest.Mocked<Redis>>(getRedisConnectionToken());

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = { headers: {} };

      mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;
    });

    describe('Missing or invalid idempotency key', () => {
      it('allows when no idempotency key header', async () => {
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('allows when idempotency key is empty', async () => {
        mockRequest.headers['idempotency-key'] = '';
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('allows when idempotency key is too short', async () => {
        mockRequest.headers['idempotency-key'] = 'short';
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
        expect(redis.set).not.toHaveBeenCalled();
      });

      it('allows when idempotency key is exactly minimum length', async () => {
        mockRequest.headers['idempotency-key'] = 'a'.repeat(16);
        redis.set.mockResolvedValue('OK' as any);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(
          'idemp:' + 'a'.repeat(16),
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });
    });

    describe('Valid idempotency key scenarios', () => {
      beforeEach(() => {
        redis.set.mockResolvedValue('OK' as any);
      });

      it('allows for new idempotency key', async () => {
        mockRequest.headers['idempotency-key'] = 'valid-key-12345';
        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(
          'idemp:valid-key-12345',
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });

      it('uses correct Redis key format', async () => {
        const testKey = 'test-idempotency-key';
        mockRequest.headers['idempotency-key'] = testKey;

        await guard.canActivate(mockContext);

        expect(redis.set).toHaveBeenCalledWith(
          `idemp:${testKey}`,
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });

      it('sets TTL to 24 hours', async () => {
        mockRequest.headers['idempotency-key'] = 'test-key';
        await guard.canActivate(mockContext);

        expect(redis.set).toHaveBeenCalledWith(
          'idemp:test-key',
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });

      it('handles array header', async () => {
        mockRequest.headers['idempotency-key'] = ['test-key'];
        await guard.canActivate(mockContext);

        expect(redis.set).toHaveBeenCalledWith(
          'idemp:test-key',
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });
    });

    describe('Duplicate key scenarios', () => {
      it('throws ConflictException for duplicate key', async () => {
        mockRequest.headers['idempotency-key'] = 'duplicate-key';
        redis.set.mockResolvedValue(null as any); // NX فشلت (المفتاح موجود)

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ConflictException('duplicate idempotency-key'),
        );

        expect(redis.set).toHaveBeenCalledWith(
          'idemp:duplicate-key',
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });

      it('consistent error message', async () => {
        mockRequest.headers['idempotency-key'] = 'duplicate-key';
        redis.set.mockResolvedValue(null as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ConflictException('duplicate idempotency-key'),
        );
      });
    });

    describe('Redis interaction', () => {
      beforeEach(() => {
        mockRequest.headers['idempotency-key'] = 'test-key';
      });

      it('calls Redis set with correct parameters', async () => {
        redis.set.mockResolvedValue('OK' as any);
        await guard.canActivate(mockContext);

        expect(redis.set).toHaveBeenCalledWith(
          'idemp:test-key',
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });

      it('handles Redis errors gracefully', async () => {
        redis.set.mockRejectedValue(new Error('Redis connection failed'));

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Redis operation failed: Redis connection failed',
        );
      });

      it('handles Redis timeout', async () => {
        redis.set.mockImplementation(() => {
          return new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout')), 100),
          ) as any;
        });

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Redis operation failed: Timeout',
        );
      });
    });

    describe('Edge cases', () => {
      it('handles malformed request object', async () => {
        (mockContext as any).switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => null),
        }));

        await expect(guard.canActivate(mockContext)).rejects.toThrow();
      });

      it('handles request without headers', async () => {
        const requestWithoutHeaders = {} as any;
        (mockContext as any).switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => requestWithoutHeaders),
        }));

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
      });

      it('handles very long keys', async () => {
        const longKey = 'a'.repeat(1000);
        mockRequest.headers['idempotency-key'] = longKey;
        redis.set.mockResolvedValue('OK' as any);

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(
          `idemp:${longKey}`,
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });

      it('handles special characters', async () => {
        const specialKey = 'key-with-!@#$%^&*()_+{}|:<>?[]\\;\',"./-symbols';
        mockRequest.headers['idempotency-key'] = specialKey;
        redis.set.mockResolvedValue('OK' as any);

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(
          `idemp:${specialKey}`,
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });

      it('handles Unicode characters', async () => {
        const unicodeKey = 'key-with-unicode-🚀-字符';
        mockRequest.headers['idempotency-key'] = unicodeKey;
        redis.set.mockResolvedValue('OK' as any);

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
        expect(redis.set).toHaveBeenCalledWith(
          `idemp:${unicodeKey}`,
          '1',
          'EX',
          60 * 60 * 24,
          'NX',
        );
      });
    });

    describe('Integration scenarios', () => {
      it('works in typical API scenario', async () => {
        mockRequest.headers['idempotency-key'] = 'test-request-id';
        redis.set.mockResolvedValue('OK' as any);

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
      });

      it('handles duplicate request', async () => {
        mockRequest.headers['idempotency-key'] = 'duplicate-request';
        redis.set.mockResolvedValue(null as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new ConflictException('duplicate idempotency-key'),
        );
      });
    });

    describe('Performance considerations', () => {
      it('handles rapid successive calls', async () => {
        mockRequest.headers['idempotency-key'] = 'performance-test';
        redis.set.mockResolvedValue('OK' as any);

        const results: boolean[] = [];
        for (let i = 0; i < 100; i++) {
          results.push(await guard.canActivate(mockContext));
        }

        expect(results).toHaveLength(100);
        expect(results.every((r) => r === true)).toBe(true);
      });
    });

    describe('Guard properties and methods', () => {
      it('proper guard implementation', () => {
        expect(guard).toBeInstanceOf(Object);
        expect(typeof guard.canActivate).toBe('function');
      });

      it('has access to Redis client', () => {
        expect((guard as any)['redis']).toBeDefined();
        expect((guard as any)['redis']).toBeInstanceOf(Object);
      });
    });

    describe('Async behavior', () => {
      it('returns Promise<boolean>', async () => {
        mockRequest.headers['idempotency-key'] = 'async-test';
        redis.set.mockResolvedValue('OK' as any);

        const result = guard.canActivate(mockContext);
        expect(result).toBeInstanceOf(Promise);

        const resolved = await result;
        expect(resolved).toBe(true);
      });

      it('handles Promise rejection correctly', async () => {
        mockRequest.headers['idempotency-key'] = 'error-test';
        redis.set.mockRejectedValue(new Error('Redis error'));

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Redis operation failed: Redis error',
        );
      });
    });
  });
});
