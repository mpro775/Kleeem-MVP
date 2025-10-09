import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { TokenService } from '../services/token.service';

import type { SessionStore } from '../repositories/session-store.repository';
import type { TestingModule } from '@nestjs/testing';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let _configService: jest.Mocked<ConfigService>;
  let sessionStore: jest.Mocked<SessionStore>;

  const mockJwtService = {
    sign: jest.fn(),
    signAsync: jest.fn(),
    verify: jest.fn(),
    verifyAsync: jest.fn(),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_TTL: '7d',
        JWT_SECRET: 'test-secret',
        JWT_ISSUER: 'test-issuer',
        JWT_AUDIENCE: 'test-audience',
        JWT_REFRESH_SALT: 'test-salt',
      };
      return config[key as keyof typeof config];
    }),
  };

  const mockSessionStore = {
    setSession: jest.fn(),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
    addUserSession: jest.fn(),
    getUserSessions: jest.fn(),
    clearUserSessions: jest.fn(),
    addToBlacklist: jest.fn(),
    isBlacklisted: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'SessionStore',
          useValue: mockSessionStore,
        },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
    _configService = module.get(ConfigService);
    sessionStore = module.get('SessionStore');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccessOnly', () => {
    const payload = {
      userId: 'user-id',
      role: 'MERCHANT' as const,
      merchantId: null,
    };

    it('should create access token only', () => {
      // Arrange
      const mockToken = 'access-token';
      jwtService.sign.mockReturnValue(mockToken);

      // Act
      const result = service.createAccessOnly(payload);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-id',
          userId: 'user-id',
          role: 'MERCHANT',
          merchantId: null,
        }),
        expect.objectContaining({
          expiresIn: '15m',
        }),
      );
      expect(result).toEqual({ accessToken: mockToken, jti: undefined });
    });

    it('should handle signing errors', async () => {
      // Arrange
      jwtService.sign.mockImplementation(() => {
        throw new Error('Signing failed');
      });

      // Act & Assert
      await expect(service.createAccessOnly(payload)).rejects.toThrow(
        'Signing failed',
      );
    });
  });

  describe('createTokenPair', () => {
    const payload = {
      userId: 'user-id',
      role: 'MERCHANT' as const,
      merchantId: null,
    };

    const sessionInfo = {
      userAgent: 'test-agent',
      ip: '192.168.1.1',
    };

    it('should create token pair successfully', async () => {
      // Arrange
      const accessToken = 'access-token';
      const refreshToken = 'refresh-token';

      jwtService.sign
        .mockReturnValueOnce(accessToken) // access token
        .mockReturnValueOnce(refreshToken); // refresh token

      sessionStore.setSession.mockResolvedValue(undefined);

      // Act
      const result = await service.createTokenPair(payload, sessionInfo);

      // Assert
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(sessionStore.setSession).toHaveBeenCalled();
      expect(result).toEqual({
        accessToken,
        refreshToken,
      });
    });

    it('should handle session creation errors', async () => {
      // Arrange
      jwtService.sign.mockReturnValue('token');
      sessionStore.setSession.mockRejectedValue(
        new Error('Session creation failed'),
      );

      // Act & Assert
      await expect(
        service.createTokenPair(payload, sessionInfo),
      ).rejects.toThrow('Session creation failed');
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      const refreshToken = 'refresh-token';
      const decodedToken = { sub: 'user-id', jti: 'session-id' };

      jwtService.verify.mockReturnValue(decodedToken);
      sessionStore.getSession.mockResolvedValue({} as any);

      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith(
        refreshToken,
        expect.any(Object),
      );
      expect(sessionStore.getSession).toHaveBeenCalledWith('session-id');
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw error for invalid token', async () => {
      // Arrange
      const refreshToken = 'invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act & Assert
      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token successfully', async () => {
      // Arrange
      const jti = 'session-id';
      sessionStore.deleteSession.mockResolvedValue(undefined);

      // Act
      await service.revokeRefreshToken(jti);

      // Assert
      expect(sessionStore.deleteSession).toHaveBeenCalledWith(jti);
    });

    it('should handle revoke errors', async () => {
      // Arrange
      const jti = 'session-id';
      sessionStore.deleteSession.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(service.revokeRefreshToken(jti)).rejects.toThrow(
        'Delete failed',
      );
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all user sessions successfully', async () => {
      // Arrange
      const userId = 'user-id';
      sessionStore.clearUserSessions.mockResolvedValue(undefined);

      // Act
      await service.revokeAllUserSessions(userId);

      // Assert
      expect(sessionStore.clearUserSessions).toHaveBeenCalledWith(userId);
    });

    it('should handle revoke all errors', async () => {
      // Arrange
      const userId = 'user-id';
      sessionStore.clearUserSessions.mockRejectedValue(
        new Error('Delete all failed'),
      );

      // Act & Assert
      await expect(service.revokeAllUserSessions(userId)).rejects.toThrow(
        'Delete all failed',
      );
    });
  });

  describe('blacklistAccessJti', () => {
    it('should blacklist access token successfully', async () => {
      // Arrange
      const jti = 'access-jti';
      const ttlSeconds = 900;

      // Act
      await service.blacklistAccessJti(jti, ttlSeconds);

      // Assert
      expect(sessionStore.addToBlacklist).toHaveBeenCalledWith(jti, ttlSeconds);
    });

    it('should handle blacklist errors', async () => {
      // Arrange
      const jti = 'access-jti';
      const ttlSeconds = 900;
      sessionStore.addToBlacklist.mockRejectedValue(
        new Error('Blacklist failed'),
      );

      // Act & Assert
      await expect(service.blacklistAccessJti(jti, ttlSeconds)).rejects.toThrow(
        'Blacklist failed',
      );
    });
  });

  describe('validateAccessToken', () => {
    it('should validate access token successfully', async () => {
      // Arrange
      const token = 'access-token';
      const payload = {
        sub: 'user-id',
        userId: 'user-id',
        role: 'MERCHANT',
        exp: Math.floor(Date.now() / 1000) + 900, // expires in 15 minutes
      };

      jwtService.verify.mockReturnValue(payload);
      sessionStore.isBlacklisted.mockResolvedValue(false);

      // Act
      const result = await service.validateAccessToken(token);

      // Assert
      expect(jwtService.verify).toHaveBeenCalledWith(token, expect.any(Object));
      expect(sessionStore.isBlacklisted).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return null for invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Act
      const result = await service.validateAccessToken(token);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validateSession', () => {
    it('should validate session successfully', async () => {
      // Arrange
      const jti = 'session-id';
      const sessionData = {
        jti,
        userId: 'user-id',
      };

      sessionStore.getSession.mockResolvedValue(sessionData as any);

      // Act
      const result = await service.validateSession(jti);

      // Assert
      expect(sessionStore.getSession).toHaveBeenCalledWith(jti);
      expect(result).toEqual(sessionData);
    });

    it('should return null for invalid session', async () => {
      // Arrange
      const jti = 'invalid-session-id';
      sessionStore.getSession.mockResolvedValue(null);

      // Act
      const result = await service.validateSession(jti);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getSessionCsrfToken', () => {
    it('should return CSRF token for session', async () => {
      // Arrange
      const jti = 'session-id';

      // Mock private method getCsrfToken
      jest
        .spyOn(service as any, 'getCsrfToken')
        .mockResolvedValue('csrf-token');

      // Act
      const result = await service.getSessionCsrfToken(jti);

      // Assert
      expect(result).toBe('csrf-token');
    });

    it('should return null for session without CSRF token', async () => {
      // Arrange
      const jti = 'session-id';

      // Mock private method getCsrfToken
      jest.spyOn(service as any, 'getCsrfToken').mockResolvedValue(null);

      // Act
      const result = await service.getSessionCsrfToken(jti);

      // Assert
      expect(result).toBeNull();
    });
  });
});
