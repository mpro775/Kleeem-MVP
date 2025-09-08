import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { TokenService, JwtPayload, TokenPair } from './token.service';

describe('TokenService', () => {
  let service: TokenService;
  let jwtService: jest.Mocked<JwtService>;
  let cacheManager: jest.Mocked<any>;
  let configService: jest.Mocked<ConfigService>;

  const mockPayload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'> = {
    userId: 'user123',
    role: 'MERCHANT',
    merchantId: 'merchant456',
  };

  beforeEach(async () => {
    const mockJwtService = {
      sign: jest.fn(),
      verifyAsync: jest.fn(),
      decode: jest.fn(),
      verify: jest.fn(),
    };

    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          JWT_SECRET: 'test-secret',
          JWT_ACCESS_EXPIRES: '15m',
          JWT_REFRESH_EXPIRES: '7d',
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenService>(TokenService);
    jwtService = module.get(JwtService);
    cacheManager = module.get(CACHE_MANAGER);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTokenPair', () => {
    it('should create access and refresh tokens with session data', async () => {
      const mockTokens = {
        accessToken: 'mock.access.token',
        refreshToken: 'mock.refresh.token',
      };

      jwtService.sign
        .mockReturnValueOnce(mockTokens.accessToken)
        .mockReturnValueOnce(mockTokens.refreshToken);

      const sessionInfo = {
        userAgent: 'test-agent',
        ip: '127.0.0.1',
      };

      const result = await service.createTokenPair(mockPayload, sessionInfo);

      expect(result).toEqual(mockTokens);
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(cacheManager.set).toHaveBeenCalledWith(
        expect.stringMatching(/^sess:/),
        expect.any(String),
        expect.any(Number),
      );
    });

    it('should handle missing session info', async () => {
      jwtService.sign
        .mockReturnValueOnce('access.token')
        .mockReturnValueOnce('refresh.token');

      const result = await service.createTokenPair(mockPayload);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(cacheManager.set).toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    const mockRefreshToken = 'valid.refresh.token';
    const mockDecodedToken: JwtPayload = {
      ...mockPayload,
      jti: 'refresh-jti-123',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    };

    it('should rotate refresh token successfully', async () => {
      const mockSessionData = JSON.stringify({
        userId: mockPayload.userId,
        role: mockPayload.role,
        merchantId: mockPayload.merchantId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      // Mock the decode and verify methods
      jwtService.decode.mockReturnValue(mockDecodedToken);
      jwtService.verify.mockReturnValue(mockDecodedToken);
      cacheManager.get.mockResolvedValue(mockSessionData);
      cacheManager.del.mockResolvedValue(1);
      cacheManager.set.mockResolvedValue(undefined);
      jwtService.sign
        .mockReturnValueOnce('new.access.token')
        .mockReturnValueOnce('new.refresh.token');

      const result = await service.refreshTokens(mockRefreshToken);

      expect(result).toHaveProperty('accessToken', 'new.access.token');
      expect(result).toHaveProperty('refreshToken', 'new.refresh.token');
      expect(jwtService.decode).toHaveBeenCalledWith(mockRefreshToken);
      expect(jwtService.verify).toHaveBeenCalledWith(mockRefreshToken);
      expect(cacheManager.del).toHaveBeenCalledWith(
        `sess:${mockDecodedToken.jti}`,
      );
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jwtService.decode.mockReturnValue(null);

      await expect(service.refreshTokens('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for revoked session', async () => {
      jwtService.decode.mockReturnValue(mockDecodedToken);
      cacheManager.get.mockResolvedValue(null); // Session not found = revoked

      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should not allow reusing old refresh token', async () => {
      const mockSessionData = JSON.stringify({
        userId: mockPayload.userId,
        role: mockPayload.role,
        merchantId: mockPayload.merchantId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      // First call setup
      jwtService.decode.mockReturnValue(mockDecodedToken);
      jwtService.verify.mockReturnValue(mockDecodedToken);
      cacheManager.get.mockResolvedValueOnce(mockSessionData);
      cacheManager.del.mockResolvedValue(1);
      cacheManager.set.mockResolvedValue(undefined);
      jwtService.sign
        .mockReturnValueOnce('new.access.token')
        .mockReturnValueOnce('new.refresh.token');

      // First rotation should succeed
      const firstResult = await service.refreshTokens(mockRefreshToken);
      expect(firstResult).toHaveProperty('accessToken');

      // Second call setup - session no longer exists
      cacheManager.get.mockResolvedValueOnce(null);

      // Second rotation with same token should fail
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('revokeRefreshToken', () => {
    it('should revoke refresh token by JTI', async () => {
      const jti = 'test-jti-123';
      cacheManager.del.mockResolvedValue(1);
      cacheManager.set.mockResolvedValue(undefined);

      await service.revokeRefreshToken(jti);

      expect(cacheManager.del).toHaveBeenCalledWith(`sess:${jti}`);
      expect(cacheManager.set).toHaveBeenCalledWith(
        `bl:${jti}`,
        'revoked',
        expect.any(Number),
      );
    });

    it('should handle revocation of non-existent token', async () => {
      const jti = 'non-existent-jti';
      cacheManager.del.mockResolvedValue(0);
      cacheManager.set.mockResolvedValue(undefined);

      await expect(service.revokeRefreshToken(jti)).resolves.not.toThrow();
    });
  });

  describe('validateSession', () => {
    it('should validate active session', async () => {
      const jti = 'valid-jti-123';
      const mockSessionData = JSON.stringify({
        userId: mockPayload.userId,
        role: mockPayload.role,
        merchantId: mockPayload.merchantId,
        createdAt: Date.now(),
        lastUsed: Date.now(),
      });

      cacheManager.get.mockResolvedValue(mockSessionData);
      cacheManager.set.mockResolvedValue(undefined);

      const result = await service.validateSession(jti);

      expect(result).toBeTruthy();
      expect(result).toHaveProperty('userId', mockPayload.userId);
      expect(result).toHaveProperty('role', mockPayload.role);
      expect(cacheManager.get).toHaveBeenCalledWith(`sess:${jti}`);
      expect(cacheManager.set).toHaveBeenCalled(); // Updates lastUsed
    });

    it('should reject invalid session', async () => {
      const jti = 'invalid-jti-123';
      cacheManager.get.mockResolvedValue(null);

      const result = await service.validateSession(jti);

      expect(result).toBeNull();
    });

    it('should handle malformed session data', async () => {
      const jti = 'malformed-jti';
      cacheManager.get.mockResolvedValue('invalid-json');

      const result = await service.validateSession(jti);

      expect(result).toBeNull();
    });
  });

  describe('parseTimeToSeconds', () => {
    it('should parse time strings correctly', () => {
      // Test private method through reflection
      const parseMethod = (service as any).parseTimeToSeconds.bind(service);

      expect(parseMethod('15m')).toBe(15 * 60);
      expect(parseMethod('2h')).toBe(2 * 60 * 60);
      expect(parseMethod('7d')).toBe(7 * 24 * 60 * 60);
      expect(parseMethod('30s')).toBe(30);
    });

    it('should throw error for unknown time unit', () => {
      const parseMethod = (service as any).parseTimeToSeconds.bind(service);

      expect(() => parseMethod('15x')).toThrow('Invalid time format: 15x');
    });
  });
});
