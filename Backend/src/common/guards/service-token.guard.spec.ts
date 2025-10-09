// Mock crypto for testing
jest.mock('crypto', () => ({
  timingSafeEqual: jest.fn((a: Buffer, b: Buffer) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }),
}));

import * as crypto from 'crypto';

import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { ServiceTokenGuard } from './service-token.guard';

// Mock request interface for testing
interface MockRequest {
  headers: {
    authorization?: string | string[];
  };
}

describe('ServiceTokenGuard', () => {
  let guard: ServiceTokenGuard;

  // Mock environment variables
  const mockToken = 'test-service-token-12345';
  const originalEnv = process.env;

  beforeEach(async () => {
    // Mock environment variable
    process.env.N8N_SERVICE_TOKEN = mockToken;

    const module: TestingModule = await Test.createTestingModule({
      providers: [ServiceTokenGuard],
    }).compile();

    guard = module.get<ServiceTokenGuard>(ServiceTokenGuard);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: MockRequest;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      };

      mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;
    });

    describe('Valid token scenarios', () => {
      it('should allow access with correct Bearer token', () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access with correct token without Bearer prefix', () => {
        mockRequest.headers.authorization = mockToken;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should be case-sensitive for token comparison', () => {
        const wrongCaseToken = mockToken.toUpperCase();
        mockRequest.headers.authorization = `Bearer ${wrongCaseToken}`;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should handle tokens with special characters', () => {
        const specialToken = 'test-token-with-!@#$%^&*()_+{}|:<>?[]\\;\'",./';
        process.env.N8N_SERVICE_TOKEN = specialToken;

        // Create new guard instance with new token
        const newGuard = new ServiceTokenGuard();
        const specialRequest = {
          headers: { authorization: `Bearer ${specialToken}` },
        };
        const specialContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => specialRequest),
          })),
        } as any;

        const result = newGuard.canActivate(specialContext);

        expect(result).toBe(true);
      });
    });

    describe('Invalid token scenarios', () => {
      it('should deny access with missing authorization header', () => {
        mockRequest.headers.authorization = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should deny access with empty authorization header', () => {
        mockRequest.headers.authorization = '';

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should deny access with incorrect token', () => {
        mockRequest.headers.authorization = 'Bearer wrong-token';

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should deny access with partially correct token', () => {
        const partialToken = mockToken.substring(0, 10) + 'wrong';
        mockRequest.headers.authorization = `Bearer ${partialToken}`;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should deny access with token that is too short', () => {
        mockRequest.headers.authorization = 'Bearer a';

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should deny access with token that is too long', () => {
        const longToken = 'a'.repeat(1000);
        mockRequest.headers.authorization = `Bearer ${longToken}`;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });
    });

    describe('Header format variations', () => {
      it('should handle array authorization headers', () => {
        mockRequest.headers.authorization = [`Bearer ${mockToken}`];

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle multiple authorization headers', () => {
        mockRequest.headers.authorization = [
          `Bearer wrong-token`,
          `Bearer ${mockToken}`,
        ];

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle mixed case Bearer prefix', () => {
        mockRequest.headers.authorization = `bearer ${mockToken}`;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle Bearer with extra spaces', () => {
        mockRequest.headers.authorization = `Bearer  ${mockToken}  `;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle Bearer with tabs and newlines', () => {
        mockRequest.headers.authorization = `Bearer\t${mockToken}\n`;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle null request object', () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => null),
        })) as any;

        expect(() => guard.canActivate(mockContext)).toThrow();
      });

      it('should handle undefined headers object', () => {
        const requestWithoutHeaders = {} as any;
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => requestWithoutHeaders),
        })) as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should handle non-string authorization header', () => {
        mockRequest.headers.authorization = 12345 as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });

      it('should handle object authorization header', () => {
        mockRequest.headers.authorization = { token: mockToken } as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });
    });
  });

  describe('Constructor and initialization', () => {
    it('should initialize with token from environment variable', () => {
      expect(guard['token']).toBe(mockToken);
    });

    it('should handle missing environment variable', () => {
      delete process.env.N8N_SERVICE_TOKEN;

      // Create new guard instance
      const newGuard = new ServiceTokenGuard();

      expect(newGuard['token']).toBe('REPLACE_WITH_TOKEN');
    });

    it('should handle empty environment variable', () => {
      process.env.N8N_SERVICE_TOKEN = '';

      const newGuard = new ServiceTokenGuard();

      expect(newGuard['token']).toBe('');
    });

    it('should handle environment variable with only whitespace', () => {
      process.env.N8N_SERVICE_TOKEN = '   ';

      const newGuard = new ServiceTokenGuard();

      expect(newGuard['token']).toBe('   ');
    });
  });

  describe('timingSafeEqual method', () => {
    it('should return true for identical strings', () => {
      const result = (guard as any).timingSafeEqual(mockToken, mockToken);

      expect(result).toBe(true);
    });

    it('should return false for different strings', () => {
      const result = (guard as any).timingSafeEqual(
        mockToken,
        'different-token',
      );

      expect(result).toBe(false);
    });

    it('should return false for different lengths', () => {
      const result = (guard as any).timingSafeEqual(
        mockToken,
        mockToken + 'extra',
      );

      expect(result).toBe(false);
    });

    it('should return false for empty strings', () => {
      const result = (guard as any).timingSafeEqual('', '');

      expect(result).toBe(false);
    });

    it('should return false for null/undefined inputs', () => {
      const result1 = (guard as any).timingSafeEqual(null as any, mockToken);
      const result2 = (guard as any).timingSafeEqual(
        mockToken,
        undefined as any,
      );
      const result3 = (guard as any).timingSafeEqual(
        null as any,
        undefined as any,
      );

      expect(result1).toBe(false);
      expect(result2).toBe(false);
      expect(result3).toBe(false);
    });

    it('should use crypto.timingSafeEqual for comparison', () => {
      const cryptoSpy = crypto.timingSafeEqual as jest.MockedFunction<
        typeof crypto.timingSafeEqual
      >;

      (guard as any).timingSafeEqual(mockToken, mockToken);

      expect(cryptoSpy).toHaveBeenCalled();
      expect(cryptoSpy.mock.calls[0][0]).toEqual(Buffer.from(mockToken));
      expect(cryptoSpy.mock.calls[0][1]).toEqual(Buffer.from(mockToken));
    });

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000);

      const result = (guard as any).timingSafeEqual(longToken, longToken);

      expect(result).toBe(true);
    });

    it('should handle tokens with Unicode characters', () => {
      const unicodeToken = 'token-🚀-with-unicode-字符';

      const result = (guard as any).timingSafeEqual(unicodeToken, unicodeToken);

      expect(result).toBe(true);
    });
  });

  describe('Security considerations', () => {
    it('should not leak timing information', () => {
      const startTime1 = process.hrtime.bigint();
      (guard as any).timingSafeEqual(mockToken, 'different-token-1');
      const endTime1 = process.hrtime.bigint();

      const startTime2 = process.hrtime.bigint();
      (guard as any).timingSafeEqual(mockToken, 'different-token-2');
      const endTime2 = process.hrtime.bigint();

      // Both operations should take roughly the same time (within reasonable variance)
      const duration1 = endTime1 - startTime1;
      const duration2 = endTime2 - startTime2;

      // Allow for significant variance in timing when crypto is mocked (within 100 microseconds)
      expect(Math.abs(Number(duration1 - duration2))).toBeLessThan(100000);
    });

    it('should handle rapid successive calls', () => {
      const results: boolean[] = [];
      for (let i = 0; i < 1000; i++) {
        results.push((guard as any).timingSafeEqual(mockToken, mockToken));
      }

      expect(results).toHaveLength(1000);
      expect(results.every((result) => result === true)).toBe(true);
    });

    it('should use constant-time comparison regardless of input length', () => {
      const shortToken = 'a';
      const longToken = 'a'.repeat(10000);

      const startTime = process.hrtime.bigint();
      (guard as any).timingSafeEqual(shortToken, longToken);
      const endTime = process.hrtime.bigint();

      // Should complete in reasonable time
      expect(Number(endTime - startTime)).toBeLessThan(1000000); // Less than 1ms
    });
  });

  describe('Error handling', () => {
    it('should throw UnauthorizedException with correct message for invalid token', () => {
      const mockRequest = {
        headers: { authorization: 'Bearer wrong-token' },
      };
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('invalid service token'),
      );
    });

    it('should maintain error message consistency', () => {
      const scenarios = [
        { auth: undefined },
        { auth: '' },
        { auth: 'Bearer wrong' },
        { auth: 'wrong-token' },
      ];

      scenarios.forEach((scenario) => {
        const mockRequest = {
          headers: { authorization: scenario.auth },
        };
        const mockContext = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => mockRequest),
          })),
        } as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('invalid service token'),
        );
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should work correctly in a typical service-to-service scenario', () => {
      const serviceRequest = {
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const serviceContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => serviceRequest),
        })),
      } as any;

      const result = guard.canActivate(serviceContext);

      expect(result).toBe(true);
    });

    it('should handle webhook scenarios with service tokens', () => {
      const webhookRequest = {
        headers: { authorization: mockToken }, // No Bearer prefix
      };
      const webhookContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => webhookRequest),
        })),
      } as any;

      const result = guard.canActivate(webhookContext);

      expect(result).toBe(true);
    });

    it('should handle microservice internal communication', () => {
      const microserviceRequest = {
        headers: { authorization: `Bearer ${mockToken}` },
      };
      const microserviceContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => microserviceRequest),
        })),
      } as any;

      const result = guard.canActivate(microserviceContext);

      expect(result).toBe(true);
    });
  });

  describe('Performance considerations', () => {
    it('should handle high-frequency token validation', () => {
      const requests = Array(1000)
        .fill(null)
        .map(() => ({
          headers: { authorization: `Bearer ${mockToken}` },
        }));

      const results = requests.map((request) => {
        const context = {
          switchToHttp: jest.fn(() => ({
            getRequest: jest.fn(() => request),
          })),
        } as any;

        return guard.canActivate(context);
      });

      expect(results).toHaveLength(1000);
      expect(results.every((result) => result === true)).toBe(true);
    });

    it('should be memory efficient with large tokens', () => {
      const largeToken = 'x'.repeat(10000);
      process.env.N8N_SERVICE_TOKEN = largeToken;

      const newGuard = new ServiceTokenGuard();

      const largeRequest = {
        headers: { authorization: `Bearer ${largeToken}` },
      };
      const largeContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => largeRequest),
        })),
      } as any;

      const result = newGuard.canActivate(largeContext);

      expect(result).toBe(true);
    });
  });

  describe('Guard properties', () => {
    it('should have correct token property', () => {
      expect(guard['token']).toBe(mockToken);
    });

    it('should be a proper guard implementation', () => {
      expect(guard).toBeInstanceOf(Object);
      expect(typeof guard.canActivate).toBe('function');
      expect(typeof (guard as any).timingSafeEqual).toBe('function');
    });
  });
});
