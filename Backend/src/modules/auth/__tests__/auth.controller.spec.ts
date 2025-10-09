import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';

import { TranslationService } from '../../../common/services/translation.service';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { CookieService } from '../services/cookie.service';

import type { LogoutRequestDto, RefreshRequestDto } from '../auth.controller';
import type { ChangePasswordDto } from '../dto/change-password.dto';
import type { LoginDto } from '../dto/login.dto';
import type { RegisterDto } from '../dto/register.dto';
import type { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import type { ResendVerificationDto } from '../dto/resend-verification.dto';
import type { ResetPasswordDto } from '../dto/reset-password.dto';
import type { VerifyEmailDto } from '../dto/verify-email.dto';
import type { TestingModule } from '@nestjs/testing';
import type { Request, Response } from 'express';

// Mock external services
jest.mock('@nestjs/throttler');

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let cookieService: jest.Mocked<CookieService>;
  let _i18nService: jest.Mocked<I18nService>;
  let jwtService: jest.Mocked<JwtService>;
  let _translationService: jest.Mocked<TranslationService>;
  let _configService: jest.Mocked<ConfigService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    verifyEmail: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
    resendVerification: jest.fn(),
    requestPasswordReset: jest.fn(),
    validatePasswordResetToken: jest.fn(),
    resetPassword: jest.fn(),
    changePassword: jest.fn(),
    ensureMerchant: jest.fn(),
    getSessionCsrfToken: jest.fn(),
    getTokenService: jest.fn(),
  };

  const mockCookieService = {
    setAccessTokenCookie: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    setSecureCookie: jest.fn(),
    clearAuthCookies: jest.fn(),
  };

  const mockRequest = {
    ip: '192.168.1.1',
    headers: {
      'user-agent': 'test-agent',
      'x-csrf-token': 'csrf-token',
    },
    cookies: {
      'csrf-token': 'csrf-token',
    },
    user: undefined,
  } as any;

  const mockResponse = {
    setHeader: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: CookieService,
          useValue: mockCookieService,
        },
        {
          provide: I18nService,
          useValue: {
            t: jest.fn((key: string) => key),
          },
        },
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                AUTH_ACCESS_COOKIE_TTL: '900', // 15 minutes
                AUTH_REFRESH_COOKIE_TTL: '604800', // 7 days
                JWT_SECRET: 'test-secret',
                JWT_ISSUER: 'test-issuer',
                JWT_AUDIENCE: 'test-audience',
              };
              return config[key as keyof typeof config];
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    cookieService = module.get(CookieService);
    _i18nService = module.get(I18nService);
    jwtService = module.get(JwtService);
    _translationService = module.get(TranslationService);
    _configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    };

    const authResult = {
      accessToken: 'access-token',
      user: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MERCHANT',
        merchantId: null,
        firstLogin: true,
        emailVerified: false,
      },
    };

    it('should register user successfully', async () => {
      // Arrange
      authService.register.mockResolvedValue(authResult);

      // Act
      const result = await controller.register(registerDto);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        accessToken: 'access-token',
        user: {
          id: 'user-id',
          name: 'Test User',
          email: 'test@example.com',
          role: 'MERCHANT',
          merchantId: null,
          firstLogin: true,
          emailVerified: false,
        },
      });
    });

    it('should handle registration errors', async () => {
      // Arrange
      authService.register.mockRejectedValue(
        new BadRequestException('Registration failed'),
      );

      // Act & Assert
      await expect(controller.register(registerDto)).rejects.toThrow(
        new BadRequestException('Registration failed'),
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const authResult = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MERCHANT',
        merchantId: null,
        firstLogin: true,
        emailVerified: true,
      },
    };

    it('should login successfully', async () => {
      // Arrange
      authService.login.mockResolvedValue(authResult);
      authService.getSessionCsrfToken.mockResolvedValue('csrf-token');

      jwtService.decode.mockReturnValue({ jti: 'session-id' });

      // Act
      const result = await controller.login(
        loginDto,
        mockRequest,
        mockResponse,
      );

      // Assert
      expect(authService.login).toHaveBeenCalledWith(loginDto, {
        userAgent: 'test-agent',
        ip: '192.168.1.1',
      });
      expect(cookieService.setAccessTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        'access-token',
        900,
      );
      expect(cookieService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        'refresh-token',
        604800,
      );
      expect(cookieService.setSecureCookie).toHaveBeenCalledWith(
        mockResponse,
        'csrf-token',
        'csrf-token',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-CSRF-Token',
        'csrf-token',
      );
      expect(result).toEqual(authResult);
    });

    it('should handle login errors', async () => {
      // Arrange
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      // Act & Assert
      await expect(
        controller.login(loginDto, mockRequest, mockResponse),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials'));
    });

    it('should handle missing CSRF token', async () => {
      // Arrange
      const requestWithoutCsrf = {
        ...mockRequest,
        headers: { 'user-agent': 'test-agent' },
        cookies: {},
      };

      authService.login.mockResolvedValue(authResult);

      // Act & Assert
      await expect(
        controller.login(loginDto, requestWithoutCsrf, mockResponse),
      ).rejects.toThrow(
        new UnauthorizedException('auth.errors.csrfTokenInvalid'),
      );
    });
  });

  describe('verifyEmail', () => {
    const verifyDto: VerifyEmailDto = {
      email: 'test@example.com',
      code: '123456',
    };

    const verifyResult = {
      accessToken: 'access-token',
      user: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MERCHANT',
        merchantId: null,
        firstLogin: true,
        emailVerified: true,
      },
    };

    it('should verify email successfully', async () => {
      // Arrange
      authService.verifyEmail.mockResolvedValue(verifyResult);

      // Act
      const result = await controller.verifyEmail(verifyDto);

      // Assert
      expect(authService.verifyEmail).toHaveBeenCalledWith(verifyDto);
      expect(result).toEqual(verifyResult);
    });

    it('should handle verification errors', async () => {
      // Arrange
      authService.verifyEmail.mockRejectedValue(
        new BadRequestException('Invalid code'),
      );

      // Act & Assert
      await expect(controller.verifyEmail(verifyDto)).rejects.toThrow(
        new BadRequestException('Invalid code'),
      );
    });
  });

  describe('resendVerification', () => {
    const resendDto: ResendVerificationDto = {
      email: 'test@example.com',
    };

    it('should resend verification successfully', async () => {
      // Arrange
      authService.resendVerification.mockResolvedValue(undefined);

      // Act
      await controller.resendVerification(resendDto);

      // Assert
      expect(authService.resendVerification).toHaveBeenCalledWith(resendDto);
    });

    it('should handle resend errors', async () => {
      // Arrange
      authService.resendVerification.mockRejectedValue(
        new BadRequestException('Email not registered'),
      );

      // Act & Assert
      await expect(controller.resendVerification(resendDto)).rejects.toThrow(
        new BadRequestException('Email not registered'),
      );
    });
  });

  describe('requestReset', () => {
    const requestDto: RequestPasswordResetDto = {
      email: 'test@example.com',
    };

    it('should request password reset successfully', async () => {
      // Arrange
      authService.requestPasswordReset.mockResolvedValue(undefined);

      // Act
      const result = await controller.requestReset(requestDto);

      // Assert
      expect(authService.requestPasswordReset).toHaveBeenCalledWith(requestDto);
      expect(result).toEqual({
        status: 'success',
        message: 'i18n:auth.messages.passwordResetRequested',
      });
    });

    it('should handle request errors', async () => {
      // Arrange
      authService.requestPasswordReset.mockRejectedValue(
        new Error('Service error'),
      );

      // Act & Assert
      await expect(controller.requestReset(requestDto)).rejects.toThrow();
    });
  });

  describe('validateToken', () => {
    it('should validate reset token successfully', async () => {
      // Arrange
      const email = 'test@example.com';
      const token = 'reset-token';

      authService.validatePasswordResetToken.mockResolvedValue(true);

      // Act
      const result = await controller.validateToken(email, token);

      // Assert
      expect(authService.validatePasswordResetToken).toHaveBeenCalledWith(
        email,
        token,
      );
      expect(result).toEqual({ valid: true });
    });

    it('should return invalid for incorrect token', async () => {
      // Arrange
      authService.validatePasswordResetToken.mockResolvedValue(false);

      // Act
      const result = await controller.validateToken(
        'test@example.com',
        'invalid-token',
      );

      // Assert
      expect(result).toEqual({ valid: false });
    });
  });

  describe('reset', () => {
    const resetDto: ResetPasswordDto = {
      email: 'test@example.com',
      token: 'reset-token',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };

    it('should reset password successfully', async () => {
      // Arrange
      authService.resetPassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.reset(resetDto);

      // Assert
      expect(authService.resetPassword).toHaveBeenCalledWith(resetDto);
      expect(result).toEqual({
        status: 'success',
        message: 'i18n:auth.messages.passwordResetSuccess',
      });
    });

    it('should handle reset errors', async () => {
      // Arrange
      authService.resetPassword.mockRejectedValue(
        new BadRequestException('Invalid token'),
      );

      // Act & Assert
      await expect(controller.reset(resetDto)).rejects.toThrow(
        new BadRequestException('Invalid token'),
      );
    });
  });

  describe('ensureMerchant', () => {
    const ensureResult = {
      accessToken: 'access-token',
      user: {
        id: 'user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'MERCHANT',
        merchantId: 'merchant-id',
        firstLogin: true,
        emailVerified: true,
        active: true,
      },
    };

    it('should ensure merchant successfully', async () => {
      // Arrange
      const userId = 'user-id';
      authService.ensureMerchant.mockResolvedValue(ensureResult);

      // Act
      const result = await controller.ensureMerchant(userId);

      // Assert
      expect(authService.ensureMerchant).toHaveBeenCalledWith(userId);
      expect(result).toEqual(ensureResult);
    });

    it('should handle ensure merchant errors', async () => {
      // Arrange
      authService.ensureMerchant.mockRejectedValue(
        new BadRequestException('Email not verified'),
      );

      // Act & Assert
      await expect(controller.ensureMerchant('user-id')).rejects.toThrow(
        new BadRequestException('Email not verified'),
      );
    });
  });

  describe('change', () => {
    const changeDto: ChangePasswordDto = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };

    it('should change password successfully', async () => {
      // Arrange
      const userId = 'user-id';
      authService.changePassword.mockResolvedValue(undefined);

      // Act
      const result = await controller.change(userId, changeDto);

      // Assert
      expect(authService.changePassword).toHaveBeenCalledWith(
        userId,
        changeDto,
      );
      expect(result).toEqual({
        status: 'success',
        message: 'i18n:auth.messages.passwordChangeSuccess',
      });
    });

    it('should handle change password errors', async () => {
      // Arrange
      authService.changePassword.mockRejectedValue(
        new BadRequestException('Current password incorrect'),
      );

      // Act & Assert
      await expect(controller.change('user-id', changeDto)).rejects.toThrow(
        new BadRequestException('Current password incorrect'),
      );
    });
  });

  describe('refresh', () => {
    const refreshDto: RefreshRequestDto = {
      refreshToken: 'refresh-token',
    };

    it('should refresh tokens successfully', async () => {
      // Arrange
      const tokenPair = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      };
      authService.refreshTokens.mockResolvedValue(tokenPair);
      authService.getSessionCsrfToken.mockResolvedValue('csrf-token');

      jwtService.decode.mockReturnValue({ jti: 'session-id' });

      // Act
      const result = await controller.refresh(
        refreshDto,
        mockRequest,
        mockResponse,
      );

      // Assert
      expect(authService.refreshTokens).toHaveBeenCalledWith('refresh-token', {
        userAgent: 'test-agent',
        ip: '192.168.1.1',
      });
      expect(cookieService.setAccessTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        'new-access',
        900,
      );
      expect(cookieService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        'new-refresh',
        604800,
      );
      expect(cookieService.setSecureCookie).toHaveBeenCalledWith(
        mockResponse,
        'csrf-token',
        'csrf-token',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-CSRF-Token',
        'csrf-token',
      );
      expect(result).toEqual(tokenPair);
    });

    it('should handle refresh errors', async () => {
      // Arrange
      authService.refreshTokens.mockRejectedValue(
        new UnauthorizedException('Invalid token'),
      );

      // Act & Assert
      await expect(
        controller.refresh(refreshDto, mockRequest, mockResponse),
      ).rejects.toThrow(new UnauthorizedException('Invalid token'));
    });
  });

  describe('logout', () => {
    const logoutDto: LogoutRequestDto = {
      refreshToken: 'refresh-token',
    };

    it('should logout successfully', async () => {
      // Arrange
      authService.logout.mockResolvedValue({
        message: 'تم تسجيل الخروج بنجاح',
      });

      jwtService.decode.mockReturnValue({ jti: 'session-id' });

      // Act
      const result = await controller.logout(
        logoutDto,
        mockRequest,
        mockResponse,
      );

      // Assert
      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
      expect(cookieService.clearAuthCookies).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual({ message: 'تم تسجيل الخروج بنجاح' });
    });

    it('should handle logout errors', async () => {
      // Arrange
      authService.logout.mockRejectedValue(new Error('Logout failed'));

      // Act & Assert
      await expect(
        controller.logout(logoutDto, mockRequest, mockResponse),
      ).rejects.toThrow();
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions successfully', async () => {
      // Arrange
      const userId = 'user-id';
      authService.logoutAll.mockResolvedValue({
        message: 'تم تسجيل الخروج من كل الجلسات',
      });

      // Act
      const result = await controller.logoutAll(userId, mockResponse);

      // Assert
      expect(authService.logoutAll).toHaveBeenCalledWith(userId);
      expect(cookieService.clearAuthCookies).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual({ message: 'تم تسجيل الخروج من كل الجلسات' });
    });

    it('should handle logout all errors', async () => {
      // Arrange
      authService.logoutAll.mockRejectedValue(new Error('Logout all failed'));

      // Act & Assert
      await expect(
        controller.logoutAll('user-id', mockResponse),
      ).rejects.toThrow();
    });
  });

  describe('private methods', () => {
    describe('buildSessionInfo', () => {
      it('should build session info from request', () => {
        // Arrange
        const request = {
          ip: '192.168.1.1',
          headers: { 'user-agent': 'test-agent' },
        } as unknown as Request;

        // Act
        const result = (controller as any).buildSessionInfo(request);

        // Assert
        expect(result).toEqual({
          userAgent: 'test-agent',
          ip: '192.168.1.1',
        });
      });

      it('should handle missing user agent', () => {
        // Arrange
        const request = {
          ip: '192.168.1.1',
          headers: {},
        } as unknown as Request;

        // Act
        const result = (controller as any).buildSessionInfo(request);

        // Assert
        expect(result).toEqual({
          userAgent: '',
          ip: '192.168.1.1',
        });
      });
    });

    describe('assertValidCsrf', () => {
      it('should pass valid CSRF tokens', () => {
        // Arrange
        const request = {
          headers: { 'x-csrf-token': 'csrf-token' },
          cookies: { 'csrf-token': 'csrf-token' },
        } as unknown as Request;

        // Act & Assert (should not throw)
        expect(() =>
          (controller as any).assertValidCsrf(request),
        ).not.toThrow();
      });

      it('should throw error for missing header CSRF', () => {
        // Arrange
        const request = {
          headers: {},
          cookies: { 'csrf-token': 'csrf-token' },
        } as unknown as Request;

        // Act & Assert
        expect(() => (controller as any).assertValidCsrf(request)).toThrow(
          new UnauthorizedException('auth.errors.csrfTokenInvalid'),
        );
      });

      it('should throw error for mismatched CSRF tokens', () => {
        // Arrange
        const request = {
          headers: { 'x-csrf-token': 'different-token' },
          cookies: { 'csrf-token': 'csrf-token' },
        } as unknown as Request;

        // Act & Assert
        expect(() => (controller as any).assertValidCsrf(request)).toThrow(
          new UnauthorizedException('auth.errors.csrfTokenInvalid'),
        );
      });
    });

    describe('normalizeAuthResult', () => {
      it('should normalize auth result', () => {
        // Arrange
        const result = {
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: 123, // number instead of string
            name: 'Test User',
            email: 'test@example.com',
            role: 'MERCHANT',
            merchantId: null,
            firstLogin: true,
            emailVerified: true,
          },
        };

        // Act
        const normalized = (controller as any).normalizeAuthResult(result);

        // Assert
        expect(normalized).toEqual({
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
          user: {
            id: '123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'MERCHANT',
            merchantId: null,
            firstLogin: true,
            emailVerified: true,
          },
        });
      });
    });

    describe('validateRefreshTokenOwnership', () => {
      it('should validate token ownership successfully', () => {
        // Arrange
        const refreshToken = 'refresh-token';
        const userId = 'user-id';

        jwtService.verify.mockReturnValue({ sub: 'user-id' });

        // Act & Assert (should not throw)
        expect(() =>
          (controller as any).validateRefreshTokenOwnership(
            refreshToken,
            userId,
          ),
        ).not.toThrow();
      });

      it('should throw error for invalid token owner', () => {
        // Arrange
        const refreshToken = 'refresh-token';
        const userId = 'user-id';

        jwtService.verify.mockReturnValue({ sub: 'different-user-id' });

        // Act & Assert
        expect(() =>
          (controller as any).validateRefreshTokenOwnership(
            refreshToken,
            userId,
          ),
        ).toThrow(new UnauthorizedException('Invalid token owner'));
      });
    });

    describe('setAuthCookies', () => {
      it('should set access and refresh token cookies', () => {
        // Arrange
        const accessToken = 'access-token';
        const refreshToken = 'refresh-token';

        // Act
        (controller as any).setAuthCookies(
          mockResponse,
          accessToken,
          refreshToken,
        );

        // Assert
        expect(cookieService.setAccessTokenCookie).toHaveBeenCalledWith(
          mockResponse,
          accessToken,
          900,
        );
        expect(cookieService.setRefreshTokenCookie).toHaveBeenCalledWith(
          mockResponse,
          refreshToken,
          604800,
        );
      });

      it('should use default config values', () => {
        // Arrange
        const accessToken = 'access-token';
        const refreshToken = 'refresh-token';

        // Act
        (controller as any).setAuthCookies(
          mockResponse,
          accessToken,
          refreshToken,
        );

        // Assert
        expect(cookieService.setAccessTokenCookie).toHaveBeenCalledWith(
          mockResponse,
          accessToken,
          900,
        );
        expect(cookieService.setRefreshTokenCookie).toHaveBeenCalledWith(
          mockResponse,
          refreshToken,
          604800,
        );
      });
    });

    describe('attachCsrfFromSession', () => {
      it('should set CSRF token when JTI is present and token exists', async () => {
        // Arrange
        const refreshToken = 'refresh-token';
        const csrfToken = 'csrf-token';

        jwtService.decode.mockReturnValue({ jti: 'session-id' });
        authService.getSessionCsrfToken.mockResolvedValue(csrfToken);

        // Act
        await (controller as any).attachCsrfFromSession(
          mockResponse,
          refreshToken,
        );

        // Assert
        expect(jwtService.decode).toHaveBeenCalledWith(refreshToken);
        expect(authService.getSessionCsrfToken).toHaveBeenCalledWith(
          'session-id',
        );
        expect(cookieService.setSecureCookie).toHaveBeenCalledWith(
          mockResponse,
          'csrf-token',
          csrfToken,
        );
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-CSRF-Token',
          csrfToken,
        );
      });

      it('should not set CSRF token when JTI is missing', async () => {
        // Arrange
        const refreshToken = 'refresh-token';

        jwtService.decode.mockReturnValue({ sub: 'user-id' });

        // Act
        await (controller as any).attachCsrfFromSession(
          mockResponse,
          refreshToken,
        );

        // Assert
        expect(authService.getSessionCsrfToken).not.toHaveBeenCalled();
        expect(cookieService.setSecureCookie).not.toHaveBeenCalled();
        expect(mockResponse.setHeader).not.toHaveBeenCalled();
      });

      it('should not set CSRF token when session CSRF token is null', async () => {
        // Arrange
        const refreshToken = 'refresh-token';

        jwtService.decode.mockReturnValue({ jti: 'session-id' });
        authService.getSessionCsrfToken.mockResolvedValue(null);

        // Act
        await (controller as any).attachCsrfFromSession(
          mockResponse,
          refreshToken,
        );

        // Assert
        expect(cookieService.setSecureCookie).not.toHaveBeenCalled();
        expect(mockResponse.setHeader).not.toHaveBeenCalled();
      });
    });

    describe('blacklistAccessTokenIfPresent', () => {
      it('should blacklist access token when present in authorization header', async () => {
        // Arrange
        const request = {
          headers: { authorization: 'Bearer access-token' },
        } as unknown as Request;
        const mockTokenService = {
          blacklistAccessJti: jest.fn(),
        };

        authService.getTokenService.mockReturnValue(mockTokenService as any);
        jwtService.verify.mockReturnValue({ jti: 'access-jti', exp: 123456 });

        // Act
        await (controller as any).blacklistAccessTokenIfPresent(request);

        // Assert
        expect(jwtService.verify).toHaveBeenCalled();
        expect(mockTokenService.blacklistAccessJti).toHaveBeenCalledWith(
          'access-jti',
          expect.any(Number),
        );
      });

      it('should not blacklist when authorization header is missing', async () => {
        // Arrange
        const request = {
          headers: {},
        } as unknown as Request;
        const mockTokenService = {
          blacklistAccessJti: jest.fn(),
        };

        authService.getTokenService.mockReturnValue(mockTokenService as any);

        // Act
        await (controller as any).blacklistAccessTokenIfPresent(request);

        // Assert
        expect(jwtService.verify).not.toHaveBeenCalled();
        expect(mockTokenService.blacklistAccessJti).not.toHaveBeenCalled();
      });

      it('should not blacklist when authorization header does not start with Bearer', async () => {
        // Arrange
        const request = {
          headers: { authorization: 'Basic dXNlcjpwYXNz' },
        } as unknown as Request;
        const mockTokenService = {
          blacklistAccessJti: jest.fn(),
        };

        authService.getTokenService.mockReturnValue(mockTokenService as any);

        // Act
        await (controller as any).blacklistAccessTokenIfPresent(request);

        // Assert
        expect(jwtService.verify).not.toHaveBeenCalled();
        expect(mockTokenService.blacklistAccessJti).not.toHaveBeenCalled();
      });

      it('should handle JWT verification errors gracefully', async () => {
        // Arrange
        const request = {
          headers: { authorization: 'Bearer invalid-token' },
        } as unknown as Request;
        const mockTokenService = {
          blacklistAccessJti: jest.fn(),
        };

        authService.getTokenService.mockReturnValue(mockTokenService as any);
        jwtService.verify.mockImplementation(() => {
          throw new Error('Invalid token');
        });

        // Act & Assert (should not throw)
        await expect(
          (controller as any).blacklistAccessTokenIfPresent(request),
        ).resolves.not.toThrow();

        // Assert
        expect(mockTokenService.blacklistAccessJti).not.toHaveBeenCalled();
      });

      it('should not blacklist when JTI is missing from decoded token', async () => {
        // Arrange
        const request = {
          headers: { authorization: 'Bearer access-token' },
        } as unknown as Request;
        const mockTokenService = {
          blacklistAccessJti: jest.fn(),
        };

        authService.getTokenService.mockReturnValue(mockTokenService as any);
        jwtService.verify.mockReturnValue({ exp: 123456 });

        // Act
        await (controller as any).blacklistAccessTokenIfPresent(request);

        // Assert
        expect(mockTokenService.blacklistAccessJti).not.toHaveBeenCalled();
      });
    });
  });

  describe('helper functions', () => {
    describe('isRecord', () => {
      it('should return true for objects', () => {
        expect((controller as any).isRecord({})).toBe(true);
        expect((controller as any).isRecord({ key: 'value' })).toBe(true);
        expect((controller as any).isRecord([])).toBe(true);
      });

      it('should return false for non-objects', () => {
        expect((controller as any).isRecord(null)).toBe(false);
        expect((controller as any).isRecord(undefined)).toBe(false);
        expect((controller as any).isRecord('string')).toBe(false);
        expect((controller as any).isRecord(123)).toBe(false);
        expect((controller as any).isRecord(true)).toBe(false);
      });
    });

    describe('getHeaderString', () => {
      it('should return string header value', () => {
        const req = {
          headers: { 'user-agent': 'test-agent' },
        } as unknown as Request;

        expect((controller as any).getHeaderString(req, 'user-agent')).toBe(
          'test-agent',
        );
      });

      it('should return null for non-string header values', () => {
        const req = {
          headers: { 'content-length': 123 },
        } as unknown as Request;

        expect((controller as any).getHeaderString(req, 'content-length')).toBe(
          null,
        );
      });

      it('should return null for missing headers', () => {
        const req = {
          headers: {},
        } as unknown as Request;

        expect((controller as any).getHeaderString(req, 'missing')).toBe(null);
      });
    });

    describe('getCookieString', () => {
      it('should return string cookie value', () => {
        const req = {
          cookies: { 'session-id': 'abc123' },
        } as unknown as Request;

        expect((controller as any).getCookieString(req, 'session-id')).toBe(
          'abc123',
        );
      });

      it('should return null for non-string cookie values', () => {
        const req = {
          cookies: { count: 5 },
        } as unknown as Request;

        expect((controller as any).getCookieString(req, 'count')).toBe(null);
      });

      it('should return null for missing cookies', () => {
        const req = {
          cookies: {},
        } as unknown as Request;

        expect((controller as any).getCookieString(req, 'missing')).toBe(null);
      });

      it('should return null when cookies object is not present', () => {
        const req = {} as unknown as Request;

        expect((controller as any).getCookieString(req, 'any')).toBe(null);
      });
    });

    describe('extractJti', () => {
      it('should extract JTI from record', () => {
        const decoded = { jti: 'session-123', sub: 'user-456' };
        expect((controller as any).extractJti(decoded)).toBe('session-123');
      });

      it('should return null for non-string JTI', () => {
        const decoded = { jti: 123 };
        expect((controller as any).extractJti(decoded)).toBe(null);
      });

      it('should return null for missing JTI', () => {
        const decoded = { sub: 'user-456' };
        expect((controller as any).extractJti(decoded)).toBe(null);
      });

      it('should return null for non-record input', () => {
        expect((controller as any).extractJti('string')).toBe(null);
        expect((controller as any).extractJti(null)).toBe(null);
        expect((controller as any).extractJti(undefined)).toBe(null);
      });
    });

    describe('extractSub', () => {
      it('should extract SUB from record', () => {
        const decoded = { sub: 'user-456', jti: 'session-123' };
        expect((controller as any).extractSub(decoded)).toBe('user-456');
      });

      it('should return null for non-string SUB', () => {
        const decoded = { sub: 456 };
        expect((controller as any).extractSub(decoded)).toBe(null);
      });

      it('should return null for missing SUB', () => {
        const decoded = { jti: 'session-123' };
        expect((controller as any).extractSub(decoded)).toBe(null);
      });

      it('should return null for non-record input', () => {
        expect((controller as any).extractSub('string')).toBe(null);
        expect((controller as any).extractSub(null)).toBe(null);
        expect((controller as any).extractSub(undefined)).toBe(null);
      });
    });
  });
});
