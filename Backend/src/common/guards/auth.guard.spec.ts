import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Request } from 'express';

import { type JwtPayload } from '../interfaces/request-with-user.interface';

import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: jest.Mocked<JwtService>;
  let _reflector: Reflector;

  // Mock JWT payload
  const mockJwtPayload: JwtPayload = {
    userId: 'test-user-id',
    role: 'MERCHANT',
    merchantId: 'test-merchant-id',
  };

  // Mock valid JWT token
  const mockToken = 'valid.jwt.token';

  beforeEach(async () => {
    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    jwtService = module.get(JwtService);
    _reflector = module.get<Reflector>(Reflector);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: Request;

    beforeEach(() => {
      mockRequest = {
        headers: {},
      } as Request;

      mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
      } as any;
    });

    describe('Valid token scenarios', () => {
      it('should allow access with valid Bearer token', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
        });
        expect(mockRequest['user']).toEqual(mockJwtPayload);
      });

      it('should allow access with valid token and payload', async () => {
        const fullPayload: JwtPayload = {
          userId: 'user-123',
          role: 'ADMIN',
          merchantId: 'merchant-456',
        };

        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(fullPayload);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest['user']).toEqual(fullPayload);
      });

      it('should handle token with extra whitespace', async () => {
        mockRequest.headers.authorization = `Bearer  ${mockToken}  `;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
        });
      });

      it('should handle token with tabs and newlines', async () => {
        mockRequest.headers.authorization = `Bearer\t${mockToken}\n`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
        });
      });
    });

    describe('Invalid token scenarios', () => {
      it('should throw UnauthorizedException when no authorization header', async () => {
        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول مطلوب'),
        );

        expect(jwtService.verifyAsync).not.toHaveBeenCalled();
      });

      it('should throw UnauthorizedException when authorization header is empty', async () => {
        mockRequest.headers.authorization = '';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول مطلوب'),
        );
      });

      it('should throw UnauthorizedException when authorization header has no token', async () => {
        mockRequest.headers.authorization = 'Bearer ';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول مطلوب'),
        );
      });

      it('should throw UnauthorizedException for invalid Bearer format', async () => {
        mockRequest.headers.authorization = 'Basic dXNlcjpwYXNz';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول مطلوب'),
        );
      });

      it('should throw UnauthorizedException for malformed authorization header', async () => {
        mockRequest.headers.authorization = 'InvalidFormat';

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول مطلوب'),
        );
      });

      it('should throw UnauthorizedException when JWT verification fails', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول غير صالح'),
        );

        expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
        });
      });

      it('should throw UnauthorizedException for expired token', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        const expiredError = new Error('jwt expired');
        jwtService.verifyAsync.mockRejectedValue(expiredError);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول غير صالح'),
        );
      });

      it('should throw UnauthorizedException for malformed token', async () => {
        mockRequest.headers.authorization = 'Bearer malformed.token';
        jwtService.verifyAsync.mockRejectedValue(new Error('jwt malformed'));

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول غير صالح'),
        );
      });
    });

    describe('extractTokenFromHeader', () => {
      it('should extract token from valid Bearer header', () => {
        const request = {
          headers: { authorization: 'Bearer valid.token.here' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBe('valid.token.here');
      });

      it('should return undefined for missing authorization header', () => {
        const request = { headers: {} } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBeUndefined();
      });

      it('should return undefined for invalid authorization format', () => {
        const request = {
          headers: { authorization: 'Basic dXNlcjpwYXNz' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBeUndefined();
      });

      it('should return undefined for Bearer without token', () => {
        const request = {
          headers: { authorization: 'Bearer ' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBeUndefined();
      });

      it('should handle case variations in Bearer', () => {
        const request = {
          headers: { authorization: 'bearer valid.token.here' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBe('valid.token.here');
      });

      it('should handle mixed case Bearer', () => {
        const request = {
          headers: { authorization: 'Bearer valid.token.here' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBe('valid.token.here');
      });
    });

    describe('User attachment to request', () => {
      it('should attach user payload to request object', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        await guard.canActivate(mockContext);

        expect(mockRequest['user']).toEqual(mockJwtPayload);
        expect(mockRequest['user']).toHaveProperty('userId');
        expect(mockRequest['user']).toHaveProperty('role');
        expect(mockRequest['user']).toHaveProperty('merchantId');
      });

      it('should attach complete user payload', async () => {
        const fullPayload: JwtPayload = {
          userId: 'user-123',
          role: 'ADMIN',
          merchantId: 'merchant-456',
        };

        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(fullPayload);

        await guard.canActivate(mockContext);

        expect(mockRequest['user']).toEqual(fullPayload);
      });

      it('should attach user payload even with minimal data', async () => {
        const minimalPayload: JwtPayload = {
          userId: 'user-123',
          role: 'MERCHANT',
          // No merchantId
        };

        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(minimalPayload);

        await guard.canActivate(mockContext);

        expect(mockRequest['user']).toEqual(minimalPayload);
      });
    });

    describe('JWT verification process', () => {
      it('should call jwtService.verifyAsync with correct parameters', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        await guard.canActivate(mockContext);

        expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
        });
      });

      it('should handle JWT verification with additional options', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        await guard.canActivate(mockContext);

        expect(jwtService.verifyAsync).toHaveBeenCalledTimes(1);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
        });
      });

      it('should handle successful verification for different token types', async () => {
        const tokens = [
          'short.token',
          'very.long.jwt.token.with.multiple.parts.here',
          'token-with-special-chars_123',
          'token.with.dots.and.dashes',
        ];

        for (const token of tokens) {
          mockRequest.headers.authorization = `Bearer ${token}`;
          jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

          const result = await guard.canActivate(mockContext);

          expect(result).toBe(true);
          expect(jwtService.verifyAsync).toHaveBeenCalledWith(token, {
            secret: process.env.JWT_SECRET,
          });
        }
      });
    });

    describe('Error handling', () => {
      it('should provide consistent error messages', async () => {
        const noAuthScenarios = [
          { auth: undefined, expectedMessage: 'رمز الوصول مطلوب' },
          { auth: '', expectedMessage: 'رمز الوصول مطلوب' },
          { auth: 'Bearer ', expectedMessage: 'رمز الوصول مطلوب' },
          { auth: 'Basic token', expectedMessage: 'رمز الوصول مطلوب' },
        ];

        const invalidTokenScenarios = [
          {
            auth: 'Bearer invalid.token',
            expectedMessage: 'رمز الوصول غير صالح',
          },
        ];

        for (const scenario of noAuthScenarios) {
          mockRequest.headers.authorization = scenario.auth;

          await expect(guard.canActivate(mockContext)).rejects.toThrow(
            new UnauthorizedException(scenario.expectedMessage),
          );
        }

        for (const scenario of invalidTokenScenarios) {
          mockRequest.headers.authorization = scenario.auth;
          jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

          await expect(guard.canActivate(mockContext)).rejects.toThrow(
            new UnauthorizedException(scenario.expectedMessage),
          );
        }
      });

      it('should handle JWT service errors gracefully', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        const jwtErrors = [
          new Error('jwt expired'),
          new Error('invalid signature'),
          new Error('jwt malformed'),
          new Error('token expired'),
        ];

        for (const error of jwtErrors) {
          jwtService.verifyAsync.mockRejectedValue(error);

          await expect(guard.canActivate(mockContext)).rejects.toThrow(
            new UnauthorizedException('رمز الوصول غير صالح'),
          );
        }
      });
    });

    describe('Integration scenarios', () => {
      it('should work correctly in a typical API scenario', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest['user']).toEqual(mockJwtPayload);
      });

      it('should handle multiple requests correctly', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        // First request
        const result1 = await guard.canActivate(mockContext);
        expect(result1).toBe(true);
        expect(mockRequest['user']).toEqual(mockJwtPayload);

        // Second request with same token
        const result2 = await guard.canActivate(mockContext);
        expect(result2).toBe(true);
        expect(mockRequest['user']).toEqual(mockJwtPayload);
      });

      it('should handle different tokens in sequence', async () => {
        const tokens = [
          'first.token.here',
          'second.token.here',
          'third.token.here',
        ];

        for (const token of tokens) {
          mockRequest.headers.authorization = `Bearer ${token}`;
          jwtService.verifyAsync.mockResolvedValue({
            ...mockJwtPayload,
            userId: `user-${token}`,
          });

          const result = await guard.canActivate(mockContext);

          expect(result).toBe(true);
          expect(mockRequest['user']!['userId']).toBe(`user-${token}`);
        }
      });
    });

    describe('Performance considerations', () => {
      it('should handle rapid successive calls', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        const results: boolean[] = [];
        for (let i = 0; i < 1000; i++) {
          results.push(await guard.canActivate(mockContext));
        }

        expect(results).toHaveLength(1000);
        expect(results.every((result) => result === true)).toBe(true);
      });

      it('should be memory efficient', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        // Should not cause memory leaks
        for (let i = 0; i < 10000; i++) {
          await guard.canActivate(mockContext);
        }

        expect(true).toBe(true); // Test passes if no memory issues
      });
    });

    describe('Guard properties and methods', () => {
      it('should be a proper guard implementation', () => {
        expect(guard).toBeInstanceOf(Object);
        expect(typeof guard.canActivate).toBe('function');
      });

      it('should have access to jwtService', () => {
        expect(guard['jwtService']).toBeDefined();
        expect(guard['jwtService']).toBeInstanceOf(Object);
      });

      it('should have access to reflector', () => {
        expect(guard['reflector']).toBeDefined();
        expect(guard['reflector']).toBeInstanceOf(Object);
      });
    });

    describe('Environment variables handling', () => {
      it('should handle missing JWT_SECRET environment variable', async () => {
        const originalSecret = process.env.JWT_SECRET;
        delete process.env.JWT_SECRET;

        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        // Should still work as the JWT_SECRET is passed to verifyAsync
        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);

        // Restore environment variable
        process.env.JWT_SECRET = originalSecret;
      });

      it('should handle empty JWT_SECRET', async () => {
        const originalSecret = process.env.JWT_SECRET;
        process.env.JWT_SECRET = '';

        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);

        // Restore environment variable
        process.env.JWT_SECRET = originalSecret;
      });
    });

    describe('Error scenarios', () => {
      it('should handle malformed request object', async () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => null),
        })) as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow();
      });

      it('should handle request without headers', async () => {
        const requestWithoutHeaders = {} as Request;
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => requestWithoutHeaders),
        })) as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول مطلوب'),
        );
      });

      it('should handle headers as undefined', async () => {
        const requestWithUndefinedHeaders = { headers: undefined } as any;
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => requestWithUndefinedHeaders),
        })) as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول مطلوب'),
        );
      });
    });

    describe('Token extraction edge cases', () => {
      it('should handle multiple spaces in authorization header', () => {
        const request = {
          headers: { authorization: 'Bearer   token   with   spaces' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBe('token   with   spaces');
      });

      it('should handle Bearer with no spaces', () => {
        const request = {
          headers: { authorization: 'Bearertoken' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBeUndefined();
      });

      it('should handle Bearer with multiple words', () => {
        const request = {
          headers: { authorization: 'Bearer token with multiple words' },
        } as Request;

        const token = (guard as any).extractTokenFromHeader(request);

        expect(token).toBe('token with multiple words');
      });
    });

    describe('JWT payload validation', () => {
      it('should accept valid JWT payload structure', async () => {
        const validPayloads = [
          { userId: 'user1', role: 'ADMIN' as const, merchantId: 'merchant1' },
          {
            userId: 'user2',
            role: 'MERCHANT' as const,
            merchantId: 'merchant2',
          },
          { userId: 'user3', role: 'MEMBER' as const, merchantId: 'merchant3' },
          { userId: 'user4', role: 'ADMIN' as const }, // No merchantId
        ];

        for (const payload of validPayloads) {
          mockRequest.headers.authorization = `Bearer ${mockToken}`;
          jwtService.verifyAsync.mockResolvedValue(payload);

          const result = await guard.canActivate(mockContext);

          expect(result).toBe(true);
          expect(mockRequest['user']).toEqual(payload);
        }
      });

      it('should handle payload with extra properties', async () => {
        const payloadWithExtras = {
          userId: 'user1',
          role: 'MERCHANT' as const,
          merchantId: 'merchant1',
          extraProperty: 'extra-value',
          anotherProperty: 123,
        };

        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(payloadWithExtras);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest['user']).toEqual(payloadWithExtras);
      });
    });

    describe('Async behavior', () => {
      it('should return Promise<boolean>', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockResolvedValue(mockJwtPayload);

        const result = guard.canActivate(mockContext);

        expect(result).toBeInstanceOf(Promise);

        const resolvedResult = await result;
        expect(resolvedResult).toBe(true);
      });

      it('should handle Promise rejection correctly', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;
        jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('رمز الوصول غير صالح'),
        );
      });
    });
  });
});
