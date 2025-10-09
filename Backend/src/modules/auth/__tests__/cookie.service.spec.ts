import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { CookieService } from '../services/cookie.service';

import type { TestingModule } from '@nestjs/testing';
import type { Response } from 'express';

describe('CookieService', () => {
  let service: CookieService;
  let configService: jest.Mocked<ConfigService>;
  let mockResponse: jest.Mocked<Response>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        NODE_ENV: 'test',
        COOKIE_DOMAIN: undefined,
        COOKIE_SAMESITE: 'lax',
        COOKIE_SECURE: undefined,
      };
      return config[key as keyof typeof config];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CookieService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<CookieService>(CookieService);
    configService = module.get(ConfigService);

    mockResponse = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getSecureCookieOptions', () => {
    it('should return secure options for production environment', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'COOKIE_DOMAIN') return '.kaleem-ai.com';
        if (key === 'COOKIE_SAMESITE') return 'none';
        if (key === 'COOKIE_SECURE') return 'true';
        return undefined;
      });

      // Act
      const options = (service as any).getSecureCookieOptions();

      // Assert
      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        domain: '.kaleem-ai.com',
        path: '/',
      });
    });

    it('should return lax options for non-production environment', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'development';
        return undefined;
      });

      // Act
      const options = (service as any).getSecureCookieOptions();

      // Assert
      expect(options).toEqual({
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });
    });

    it('should handle custom cookie settings', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'COOKIE_DOMAIN') return 'custom-domain.com';
        if (key === 'COOKIE_SAMESITE') return 'strict';
        if (key === 'COOKIE_SECURE') return '1';
        return undefined;
      });

      // Act
      const options = (service as any).getSecureCookieOptions();

      // Assert
      expect(options).toEqual({
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        domain: 'custom-domain.com',
        path: '/',
      });
    });

    it('should handle invalid sameSite values', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'COOKIE_SAMESITE') return 'invalid';
        return undefined;
      });

      // Act
      const options = (service as any).getSecureCookieOptions();

      // Assert
      expect(options.sameSite).toBe('none'); // Should default to 'none' in production
    });
  });

  describe('setAccessTokenCookie', () => {
    it('should set access token cookie with correct options', () => {
      // Arrange
      const accessToken = 'access-token';
      const expiresInSeconds = 900; // 15 minutes

      // Act
      service.setAccessTokenCookie(mockResponse, accessToken, expiresInSeconds);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        accessToken,
        expect.objectContaining({
          httpOnly: true,
          secure: false, // test environment
          sameSite: 'lax',
          maxAge: 900 * 1000, // converted to milliseconds
          path: '/',
        }),
      );
    });

    it('should use production settings in production environment', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const accessToken = 'access-token';
      const expiresInSeconds = 900;

      // Act
      service.setAccessTokenCookie(mockResponse, accessToken, expiresInSeconds);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'accessToken',
        accessToken,
        expect.objectContaining({
          secure: true,
          sameSite: 'none',
        }),
      );
    });
  });

  describe('setRefreshTokenCookie', () => {
    it('should set refresh token cookie with strict security', () => {
      // Arrange
      const refreshToken = 'refresh-token';
      const expiresInSeconds = 604800; // 7 days

      // Act
      service.setRefreshTokenCookie(
        mockResponse,
        refreshToken,
        expiresInSeconds,
      );

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
          maxAge: 604800 * 1000,
          path: '/',
        }),
      );
    });

    it('should use production settings for refresh token', () => {
      // Arrange
      configService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const refreshToken = 'refresh-token';
      const expiresInSeconds = 604800;

      // Act
      service.setRefreshTokenCookie(
        mockResponse,
        refreshToken,
        expiresInSeconds,
      );

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refreshToken',
        refreshToken,
        expect.objectContaining({
          httpOnly: true,
          secure: true,
          sameSite: 'strict',
        }),
      );
    });
  });

  describe('clearAuthCookies', () => {
    it('should clear both access and refresh token cookies', () => {
      // Act
      service.clearAuthCookies(mockResponse);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
        1,
        'accessToken',
        expect.any(Object),
      );
      expect(mockResponse.clearCookie).toHaveBeenNthCalledWith(
        2,
        'refreshToken',
        expect.any(Object),
      );
    });

    it('should use correct options when clearing cookies', () => {
      // Act
      service.clearAuthCookies(mockResponse);

      // Assert
      const expectedOptions = expect.objectContaining({
        httpOnly: true,
        secure: false, // test environment
        sameSite: 'lax',
        path: '/',
      });

      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'accessToken',
        expectedOptions,
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        'refreshToken',
        expectedOptions,
      );
    });
  });

  describe('setSecureCookie', () => {
    it('should set secure cookie with expiration', () => {
      // Arrange
      const name = 'csrf-token';
      const value = 'csrf-value';
      const expiresInSeconds = 3600; // 1 hour

      // Act
      service.setSecureCookie(mockResponse, name, value, expiresInSeconds);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        name,
        value,
        expect.objectContaining({
          httpOnly: true,
          secure: false, // test environment
          sameSite: 'lax',
          maxAge: 3600 * 1000,
          path: '/',
        }),
      );
    });

    it('should set secure cookie without expiration (session cookie)', () => {
      // Arrange
      const name = 'session-cookie';
      const value = 'session-value';

      // Act
      service.setSecureCookie(mockResponse, name, value);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        name,
        value,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: undefined,
        }),
      );
    });
  });

  describe('clearCookie', () => {
    it('should clear specific cookie', () => {
      // Arrange
      const name = 'test-cookie';

      // Act
      service.clearCookie(mockResponse, name);

      // Assert
      expect(mockResponse.clearCookie).toHaveBeenCalledWith(
        name,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        }),
      );
    });
  });

  describe('setSessionCookie', () => {
    it('should set session cookie without maxAge', () => {
      // Arrange
      const name = 'session-id';
      const value = 'session-value';

      // Act
      service.setSessionCookie(mockResponse, name, value);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        name,
        value,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: undefined, // session cookie
        }),
      );
    });
  });
});
