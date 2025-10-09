import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';
import { Test } from '@nestjs/testing';

// Mock passport
jest.mock('passport', () => ({
  use: jest.fn(),
  authenticate: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

import { JwtAuthGuard } from './jwt-auth.guard';

import type { JwtPayload } from '../interfaces/request-with-user.interface';
import type { ExecutionContext } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import type { Cache } from 'cache-manager';

// Mock JWT payload interface for testing
interface MockJwtPayload extends JwtPayload {
  jti?: string;
  iat?: number;
  exp?: number;
  sub?: string;
}

// Mock request object
interface MockRequest {
  headers: { authorization?: string };
  originalUrl?: string;
  url?: string;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;
  let cacheManager: jest.Mocked<Cache>;
  let jwtService: jest.Mocked<JwtService>;

  // Mock JWT payload for testing
  const mockJwtPayload: MockJwtPayload = {
    userId: 'test-user-id',
    role: 'MERCHANT',
    merchantId: 'test-merchant-id',
    jti: 'test-jti',
    iat: Math.floor(Date.now() / 1000),
    sub: 'test-user-id',
  };

  // Mock valid JWT token
  const mockToken = 'valid.jwt.token';

  beforeEach(async () => {
    // Set up environment variables for tests
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'test-issuer';
    process.env.JWT_AUDIENCE = 'test-audience';

    // Create mocks for dependencies
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
    };

    const mockJwtService = {
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get<Reflector>(Reflector);
    cacheManager = module.get(CACHE_MANAGER);
    jwtService = module.get(JwtService);

    // Reset all mocks
    jest.clearAllMocks();
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
        originalUrl: '/test-path',
        url: '/test-path',
      };

      mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as any;
    });

    describe('Public endpoints', () => {
      it('should allow access to public endpoints marked with @Public decorator', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should allow access to public paths without @Public decorator', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        // Test /metrics path
        mockRequest.originalUrl = '/metrics';
        const result1 = await guard.canActivate(mockContext);
        expect(result1).toBe(true);

        // Test /health path
        mockRequest.originalUrl = '/health';
        const result2 = await guard.canActivate(mockContext);
        expect(result2).toBe(true);

        // Test /api/health path
        mockRequest.originalUrl = '/api/health';
        const result3 = await guard.canActivate(mockContext);
        expect(result3).toBe(true);

        // Test /uploads path
        mockRequest.originalUrl = '/uploads';
        const result4 = await guard.canActivate(mockContext);
        expect(result4).toBe(true);

        // Test /api/docs path
        mockRequest.originalUrl = '/api/docs';
        const result5 = await guard.canActivate(mockContext);
        expect(result5).toBe(true);

        // Test /api/docs-json path
        mockRequest.originalUrl = '/api/docs-json';
        const result6 = await guard.canActivate(mockContext);
        expect(result6).toBe(true);
      });

      it('should allow access to paths with public prefixes', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        // Test /metrics/some-sub-path
        mockRequest.originalUrl = '/metrics/some-sub-path';
        const result1 = await guard.canActivate(mockContext);
        expect(result1).toBe(true);

        // Test /uploads/avatar.jpg
        mockRequest.originalUrl = '/uploads/avatar.jpg';
        const result2 = await guard.canActivate(mockContext);
        expect(result2).toBe(true);
      });

      it('should deny access to non-public paths', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        // Mock AuthGuard canActivate to return false (no valid token)
        jest
          .spyOn(AuthGuard('jwt').prototype, 'canActivate')
          .mockResolvedValue(false);

        // Test protected path
        mockRequest.originalUrl = '/protected/route';
        const result = await guard.canActivate(mockContext);
        expect(result).toBe(false);
      });
    });

    describe('JWT token validation', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
        mockRequest.originalUrl = '/protected/route';
      });

      it('should allow access with valid JWT token and session', async () => {
        // Setup valid token
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        // Mock JWT verification
        jwtService.verify.mockReturnValue(mockJwtPayload);

        // Mock cache responses
        cacheManager.get.mockImplementation((key: string) => {
          if (key === `bl:${mockJwtPayload.jti}`) return null;
          if (key === `pwdChangedAt:${mockJwtPayload.sub}`) return null;
          return null as any;
        });

        // Mock AuthGuard canActivate to return true
        jest
          .spyOn(AuthGuard('jwt').prototype, 'canActivate')
          .mockResolvedValue(true);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
        });
        expect(cacheManager.get).toHaveBeenCalledWith(
          `bl:${mockJwtPayload.jti}`,
        );
        expect(cacheManager.get).toHaveBeenCalledWith(
          `pwdChangedAt:${mockJwtPayload.sub}`,
        );
      });

      it('should deny access when token is missing', async () => {
        mockRequest.headers.authorization = undefined as any;

        // Mock AuthGuard canActivate to return false (no token)
        jest
          .spyOn(AuthGuard('jwt').prototype, 'canActivate')
          .mockResolvedValue(false);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should deny access when token format is invalid', async () => {
        mockRequest.headers.authorization = 'InvalidFormat';

        // Mock AuthGuard canActivate to return false (invalid format)
        jest
          .spyOn(AuthGuard('jwt').prototype, 'canActivate')
          .mockResolvedValue(false);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should deny access when JWT verification fails', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        // Mock AuthGuard canActivate to return true
        jest
          .spyOn(AuthGuard('jwt').prototype, 'canActivate')
          .mockResolvedValue(true);

        jwtService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          UnauthorizedException,
        );
        expect(jwtService.verify).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
        });
      });

      it('should deny access when token is blacklisted', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        jwtService.verify.mockReturnValue(mockJwtPayload);
        cacheManager.get.mockImplementation((key: string) => {
          if (key === `bl:${mockJwtPayload.jti}`) return 'blacklisted';
          return null as any;
        });

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('Session expired or revoked'),
        );

        expect(cacheManager.get).toHaveBeenCalledWith(
          `bl:${mockJwtPayload.jti}`,
        );
      });

      it('should deny access when password was changed after token issued', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        const passwordChangedTime = Date.now();
        jwtService.verify.mockReturnValue({
          ...mockJwtPayload,
          iat: Math.floor((passwordChangedTime - 10000) / 1000), // Token issued 10 seconds before password change
        });

        cacheManager.get.mockImplementation((key: string) => {
          if (key === `bl:${mockJwtPayload.jti}`) return null as any;
          if (key === `pwdChangedAt:${mockJwtPayload.sub}`)
            return passwordChangedTime;

          return null as any;
        });

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should deny access when token has no JTI', async () => {
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        // Mock AuthGuard canActivate to return true
        jest
          .spyOn(AuthGuard('jwt').prototype, 'canActivate')
          .mockResolvedValue(true);

        jwtService.verify.mockReturnValue({
          ...mockJwtPayload,
          jti: undefined,
        });

        cacheManager.get.mockImplementation((_key: string) => null as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('Non-HTTP contexts', () => {
      it('should skip session validation for non-HTTP contexts', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
        mockRequest.headers.authorization = `Bearer ${mockToken}`;

        // Mock non-HTTP context
        mockContext.getType = jest.fn(() => 'ws' as any);

        jwtService.verify.mockReturnValue(mockJwtPayload);

        // Mock AuthGuard canActivate to return true
        jest
          .spyOn(AuthGuard('jwt').prototype, 'canActivate')
          .mockResolvedValue(true);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(cacheManager.get).not.toHaveBeenCalled();
      });
    });

    describe('extractTokenFromRequest', () => {
      it('should extract token from valid Bearer header', () => {
        const request = {
          headers: { authorization: 'Bearer valid.token.here' },
        } as any;

        const token = (guard as any).extractTokenFromRequest(request);

        expect(token).toBe('valid.token.here');
      });

      it('should return null for missing authorization header', () => {
        const request = { headers: {} } as any;

        const token = (guard as any).extractTokenFromRequest(request);

        expect(token).toBeNull();
      });

      it('should return null for invalid authorization format', () => {
        const request = {
          headers: { authorization: 'Basic dXNlcjpwYXNz' },
        } as any;

        const token = (guard as any).extractTokenFromRequest(request);

        expect(token).toBeNull();
      });
    });

    describe('validateTokenSession', () => {
      it('should return true for valid token session', async () => {
        jwtService.verify.mockReturnValue(mockJwtPayload);
        cacheManager.get.mockImplementation((key: string) => {
          if (key === `bl:${mockJwtPayload.jti}`) return null as any;
          if (key === `pwdChangedAt:${mockJwtPayload.sub}`) return null as any;
          if (key === `pwdChangedAt:${mockJwtPayload.sub}`) return null as any;
          return null;
        });

        const result = await (guard as any).validateTokenSession(mockToken);

        expect(result).toBe(true);
        expect(jwtService.verify).toHaveBeenCalledWith(mockToken, {
          secret: process.env.JWT_SECRET,
          issuer: process.env.JWT_ISSUER,
          audience: process.env.JWT_AUDIENCE,
        });
      });

      it('should return false for invalid token', async () => {
        jwtService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        const result = await (guard as any).validateTokenSession(
          'invalid.token',
        );

        expect(result).toBe(false);
      });

      it('should return false for blacklisted token', async () => {
        jwtService.verify.mockReturnValue(mockJwtPayload);
        cacheManager.get.mockImplementation((key: string) => {
          if (key === `bl:${mockJwtPayload.jti}`) return 'blacklisted';
          return null as any;
        });

        const result = await (guard as any).validateTokenSession(mockToken);

        expect(result).toBe(false);
      });

      it('should return false for expired password scenario', async () => {
        const passwordChangedTime = Date.now();
        jwtService.verify.mockReturnValue({
          ...mockJwtPayload,
          iat: Math.floor((passwordChangedTime - 10000) / 1000),
        });

        cacheManager.get.mockImplementation((key: string) => {
          if (key === `bl:${mockJwtPayload.jti}`) return null as any;
          if (key === `pwdChangedAt:${mockJwtPayload.sub}`)
            return passwordChangedTime;
          return null;
        });

        const result = await (guard as any).validateTokenSession(mockToken);

        expect(result).toBe(false);
      });
    });
  });

  describe('Environment variables handling', () => {
    it('should handle missing JWT_SECRET environment variable', async () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;

      const mockRequest = {
        headers: { authorization: `Bearer ${mockToken}` },
        originalUrl: '/protected',
        url: '/protected',
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as any;

      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      // Mock AuthGuard canActivate to return true
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );

      // Restore environment variable
      process.env.JWT_SECRET = originalSecret;
    });

    it('should handle missing JWT_ISSUER environment variable', async () => {
      const originalIssuer = process.env.JWT_ISSUER;
      delete process.env.JWT_ISSUER;

      const mockRequest = {
        headers: { authorization: `Bearer ${mockToken}` },
        originalUrl: '/protected',
        url: '/protected',
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as any;

      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      // Mock AuthGuard canActivate to return true
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );

      // Restore environment variable
      process.env.JWT_ISSUER = originalIssuer;
    });

    it('should handle missing JWT_AUDIENCE environment variable', async () => {
      const originalAudience = process.env.JWT_AUDIENCE;
      delete process.env.JWT_AUDIENCE;

      const mockRequest = {
        headers: { authorization: `Bearer ${mockToken}` },
        originalUrl: '/protected',
        url: '/protected',
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as any;

      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      // Mock AuthGuard canActivate to return true
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);

      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );

      // Restore environment variable
      process.env.JWT_AUDIENCE = originalAudience;
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle malformed request URLs', async () => {
      const mockRequest = {
        headers: { authorization: `Bearer ${mockToken}` },
        originalUrl: undefined,
        url: undefined,
      } as any;

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as any;

      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      // Mock AuthGuard canActivate to return true
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);

      // Mock JWT verification to succeed
      jwtService.verify.mockReturnValue(mockJwtPayload);

      // Mock cache to succeed
      cacheManager.get.mockResolvedValue(null);

      // Should not throw and should handle gracefully
      const result = await guard.canActivate(mockContext);
      expect(typeof result).toBe('boolean');
    });

    it('should handle cache manager errors gracefully', async () => {
      const mockRequest = {
        headers: { authorization: `Bearer ${mockToken}` },
        originalUrl: '/protected',
        url: '/protected',
      };

      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
          getResponse: jest.fn(() => ({
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
        getType: jest.fn(() => 'http'),
      } as any;

      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

      // Mock AuthGuard canActivate to return true
      jest
        .spyOn(AuthGuard('jwt').prototype, 'canActivate')
        .mockResolvedValue(true);

      jwtService.verify.mockReturnValue(mockJwtPayload);
      cacheManager.get.mockImplementation(() => {
        throw new Error('Cache error');
      });

      // Cache errors should result in failed session validation
      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
