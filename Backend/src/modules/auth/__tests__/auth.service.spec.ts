import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';

import { DUPLICATE_KEY_CODE } from '../../../common/filters/constants';
import { TranslationService } from '../../../common/services/translation.service';
import { BusinessMetrics } from '../../../metrics/business.metrics';
import { MailService } from '../../mail/mail.service';
import { MerchantsService } from '../../merchants/merchants.service';
import { AuthService } from '../auth.service';
import { TokenService } from '../services/token.service';

import type { ChangePasswordDto } from '../dto/change-password.dto';
import type { LoginDto } from '../dto/login.dto';
import type { RegisterDto } from '../dto/register.dto';
import type { RequestPasswordResetDto } from '../dto/request-password-reset.dto';
import type { ResendVerificationDto } from '../dto/resend-verification.dto';
import type { ResetPasswordDto } from '../dto/reset-password.dto';
import type { VerifyEmailDto } from '../dto/verify-email.dto';
import type { AuthRepository } from '../repositories/auth.repository';
import type { TestingModule } from '@nestjs/testing';

// Mock the utils
jest.mock('../utils/password-reset');
jest.mock('../utils/verification-code');
jest.mock('../utils/id');

describe('AuthService', () => {
  let service: AuthService;
  let repo: jest.Mocked<AuthRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let tokenService: jest.Mocked<TokenService>;
  let mailService: jest.Mocked<MailService>;
  let merchantsService: jest.Mocked<MerchantsService>;
  let _translationService: jest.Mocked<TranslationService>;
  let businessMetrics: jest.Mocked<BusinessMetrics>;
  let _configService: jest.Mocked<ConfigService>;
  let _cacheManager: jest.Mocked<any>;

  const mockUser = {
    _id: new Types.ObjectId(),
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
    role: 'MERCHANT',
    active: true,
    firstLogin: true,
    emailVerified: false,
    merchantId: null,
  };

  const mockMerchant = {
    _id: new Types.ObjectId(),
    name: 'Test Merchant',
    active: true,
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockRepo = {
      createUser: jest.fn(),
      findUserByEmailWithPassword: jest.fn(),
      findUserByEmailSelectId: jest.fn(),
      findUserByIdWithPassword: jest.fn(),
      findUserById: jest.fn(),
      saveUser: jest.fn(),
      createEmailVerificationToken: jest.fn(),
      latestEmailVerificationTokenByUser: jest.fn(),
      deleteEmailVerificationTokensByUser: jest.fn(),
      createPasswordResetToken: jest.fn(),
      latestPasswordResetTokenByUser: jest.fn(),
      findLatestPasswordResetForUser: jest.fn(),
      markPasswordResetTokenUsed: jest.fn(),
      deleteOtherPasswordResetTokens: jest.fn(),
      deletePasswordResetTokensByUser: jest.fn(),
      findMerchantBasicById: jest.fn(),
    };

    const mockTokenService = {
      createAccessOnly: jest.fn(),
      createTokenPair: jest.fn(),
      refreshTokens: jest.fn(),
      revokeRefreshToken: jest.fn(),
      revokeAllUserSessions: jest.fn(),
      getSessionCsrfToken: jest.fn(),
    };

    const mockMailService = {
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: 'AuthRepository',
          useValue: mockRepo,
        },
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
          },
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: MerchantsService,
          useValue: {
            ensureForUser: jest.fn(),
          },
        },
        {
          provide: TranslationService,
          useValue: {
            translate: jest.fn((key: string) => key),
          },
        },
        {
          provide: BusinessMetrics,
          useValue: {
            incEmailSent: jest.fn(),
            incEmailFailed: jest.fn(),
            incPasswordChangeCompleted: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              return undefined;
            }),
          },
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    repo = module.get('AuthRepository');
    jwtService = module.get(JwtService);
    tokenService = module.get(TokenService);
    mailService = module.get(MailService);
    merchantsService = module.get(MerchantsService);
    _translationService = module.get(TranslationService);
    businessMetrics = module.get(BusinessMetrics);
    _configService = module.get(ConfigService);
    _cacheManager = module.get(CACHE_MANAGER);
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

    it('should register user successfully', async () => {
      // Arrange
      const mockVerificationCode = '123456';
      const createdUser = { ...mockUser, _id: new Types.ObjectId() };

      repo.createUser.mockResolvedValue(createdUser as any);
      tokenService.createAccessOnly.mockReturnValue({
        accessToken: 'access-token',
        jti: 'access-jti',
      });

      // Mock the generateNumericCode function
      const { generateNumericCode } = require('../utils/verification-code');
      generateNumericCode.mockReturnValue(mockVerificationCode);

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(repo.createUser).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'MERCHANT',
        active: true,
        firstLogin: true,
        emailVerified: false,
      });
      expect(repo.createEmailVerificationToken).toHaveBeenCalledWith({
        userId: createdUser._id,
        codeHash: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        mockVerificationCode,
      );
      expect(businessMetrics.incEmailSent).toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for password mismatch', async () => {
      // Arrange
      const invalidDto: RegisterDto = {
        ...registerDto,
        confirmPassword: 'different-password',
      };

      // Act & Assert
      await expect(service.register(invalidDto)).rejects.toThrow(
        new BadRequestException('auth.errors.passwordMismatch'),
      );
    });

    it('should handle duplicate email error', async () => {
      // Arrange
      const duplicateError = {
        code: DUPLICATE_KEY_CODE,
        keyPattern: { email: 1 },
      };

      repo.createUser.mockRejectedValue(duplicateError);

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('auth.errors.emailAlreadyExists'),
      );
    });

    it('should handle mail service error gracefully', async () => {
      // Arrange
      const createdUser = { ...mockUser, _id: new Types.ObjectId() };
      repo.createUser.mockResolvedValue(createdUser as any);

      const { generateNumericCode } = require('../utils/verification-code');
      generateNumericCode.mockReturnValue('123456');

      mailService.sendVerificationEmail.mockRejectedValue(
        new Error('Mail service error'),
      );

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(businessMetrics.incEmailFailed).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const sessionInfo = {
      userAgent: 'test-agent',
      ip: '192.168.1.1',
    };

    it('should login successfully', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('password123', 10);
      const userWithPassword = { ...mockUser, password: hashedPassword };

      repo.findUserByEmailWithPassword.mockResolvedValue(
        userWithPassword as any,
      );
      repo.findMerchantBasicById.mockResolvedValue(mockMerchant as any);

      tokenService.createTokenPair.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      // Act
      const result = await service.login(loginDto, sessionInfo);

      // Assert
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@example.com');
      expect(tokenService.createTokenPair).toHaveBeenCalledWith(
        {
          userId: String(mockUser._id),
          role: 'MERCHANT',
          merchantId: null,
        },
        sessionInfo,
      );
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange
      repo.findUserByEmailWithPassword.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('auth.errors.invalidCredentials'),
      );
    });

    it('should throw error for inactive user', async () => {
      // Arrange
      const inactiveUser = {
        ...mockUser,
        active: false,
        password: 'hashedpassword',
      };
      repo.findUserByEmailWithPassword.mockResolvedValue(inactiveUser as any);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('auth.errors.accountDisabled'),
      );
    });

    it('should throw error for incorrect password', async () => {
      // Arrange
      const hashedPassword = await bcrypt.hash('wrongpassword', 10);
      const userWithWrongPassword = { ...mockUser, password: hashedPassword };

      repo.findUserByEmailWithPassword.mockResolvedValue(
        userWithWrongPassword as any,
      );

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('auth.errors.invalidCredentials'),
      );
    });

    it('should throw error for unverified email', async () => {
      // Arrange
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
        password: await bcrypt.hash('password123', 10),
      };
      repo.findUserByEmailWithPassword.mockResolvedValue(unverifiedUser as any);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('auth.errors.emailNotVerified'),
      );
    });

    it('should throw error for suspended merchant', async () => {
      // Arrange
      const suspendedMerchant = { ...mockMerchant, active: false };
      const userWithMerchant = {
        ...mockUser,
        merchantId: new Types.ObjectId(),
        password: await bcrypt.hash('password123', 10),
        emailVerified: true,
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(
        userWithMerchant as any,
      );
      repo.findMerchantBasicById.mockResolvedValue(suspendedMerchant as any);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('auth.errors.merchantAccountSuspended'),
      );
    });
  });

  describe('verifyEmail', () => {
    const verifyDto: VerifyEmailDto = {
      email: 'test@example.com',
      code: '123456',
    };

    it('should verify email successfully', async () => {
      // Arrange
      const user = { ...mockUser };
      const verificationToken = {
        _id: new Types.ObjectId(),
        codeHash: require('../utils/verification-code').sha256('123456'),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(user as any);
      repo.latestEmailVerificationTokenByUser.mockResolvedValue(
        verificationToken as any,
      );
      repo.saveUser.mockResolvedValue(user as any);
      merchantsService.ensureForUser.mockResolvedValue(mockMerchant as any);
      tokenService.createAccessOnly.mockReturnValue({
        accessToken: 'access-token',
        jti: 'access-jti',
      });

      // Act
      const result = await service.verifyEmail(verifyDto);

      // Assert
      expect(repo.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          emailVerified: true,
          firstLogin: true,
        }),
      );
      expect(repo.deleteEmailVerificationTokensByUser).toHaveBeenCalledWith(
        user._id,
      );
      expect(result.accessToken).toBe('access-token');
      expect(result.user.emailVerified).toBe(true);
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      repo.findUserByEmailWithPassword.mockResolvedValue(null);

      // Act & Assert
      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        new BadRequestException('auth.errors.invalidVerificationCode'),
      );
    });

    it('should throw error for invalid code', async () => {
      // Arrange
      const user = { ...mockUser };
      const verificationToken = {
        _id: new Types.ObjectId(),
        codeHash: require('../utils/verification-code').sha256('999999'), // Different code
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(user as any);
      repo.latestEmailVerificationTokenByUser.mockResolvedValue(
        verificationToken as any,
      );

      // Act & Assert
      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        new BadRequestException('auth.errors.invalidVerificationCode'),
      );
    });

    it('should throw error for expired code', async () => {
      // Arrange
      const user = { ...mockUser };
      const verificationToken = {
        _id: new Types.ObjectId(),
        codeHash: require('../utils/verification-code').sha256('123456'),
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago (expired)
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(user as any);
      repo.latestEmailVerificationTokenByUser.mockResolvedValue(
        verificationToken as any,
      );

      // Act & Assert
      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        new BadRequestException('auth.errors.verificationCodeExpired'),
      );
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const tokenPair = {
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      };

      tokenService.refreshTokens.mockResolvedValue(tokenPair);

      // Act
      const result = await service.refreshTokens(refreshToken);

      // Assert
      expect(tokenService.refreshTokens).toHaveBeenCalledWith(
        refreshToken,
        undefined,
      );
      expect(result).toEqual(tokenPair);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const decodedToken = { jti: 'token-id' };

      jwtService.decode.mockReturnValue(decodedToken);

      // Act
      const result = await service.logout(refreshToken);

      // Assert
      expect(jwtService.decode).toHaveBeenCalledWith(refreshToken);
      expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('token-id');
      expect(result.message).toBe('تم تسجيل الخروج بنجاح');
    });

    it('should handle logout without JTI', async () => {
      // Arrange
      const refreshToken = 'invalid-refresh-token';
      jwtService.decode.mockReturnValue({});

      // Act
      const result = await service.logout(refreshToken);

      // Assert
      expect(result.message).toBe('auth.messages.logoutSuccess');
    });
  });

  describe('logoutAll', () => {
    it('should logout all user sessions', async () => {
      // Arrange
      const userId = String(mockUser._id);

      // Act
      const result = await service.logoutAll(userId);

      // Assert
      expect(tokenService.revokeAllUserSessions).toHaveBeenCalledWith(userId);
      expect(result.message).toBe('auth.messages.logoutAllSuccess');
    });
  });

  describe('resendVerification', () => {
    const resendDto: ResendVerificationDto = {
      email: 'test@example.com',
    };

    it('should resend verification code successfully', async () => {
      // Arrange
      const user = { ...mockUser, emailVerified: false };
      const oldToken = {
        _id: new Types.ObjectId(),
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(user as any);
      repo.latestEmailVerificationTokenByUser.mockResolvedValue(
        oldToken as any,
      );

      const { generateNumericCode } = require('../utils/verification-code');
      generateNumericCode.mockReturnValue('654321');

      // Act
      await service.resendVerification(resendDto);

      // Assert
      expect(repo.createEmailVerificationToken).toHaveBeenCalledWith({
        userId: user._id,
        codeHash: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        'test@example.com',
        '654321',
      );
    });

    it('should not resend if user is already verified', async () => {
      // Arrange
      const verifiedUser = { ...mockUser, emailVerified: true };
      repo.findUserByEmailWithPassword.mockResolvedValue(verifiedUser as any);

      // Act & Assert
      await expect(service.resendVerification(resendDto)).rejects.toThrow(
        new BadRequestException('auth.errors.emailAlreadyVerified'),
      );
    });

    it('should not resend if recent token exists', async () => {
      // Arrange
      const user = { ...mockUser, emailVerified: false };
      const recentToken = {
        _id: new Types.ObjectId(),
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago (within window)
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(user as any);
      repo.latestEmailVerificationTokenByUser.mockResolvedValue(
        recentToken as any,
      );

      // Act
      await service.resendVerification(resendDto);

      // Assert
      expect(repo.createEmailVerificationToken).not.toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    const requestDto: RequestPasswordResetDto = {
      email: 'test@example.com',
    };

    it('should request password reset successfully', async () => {
      // Arrange
      const user = { ...mockUser, _id: new Types.ObjectId() };
      repo.findUserByEmailSelectId.mockResolvedValue(user as any);

      const { generateSecureToken } = require('../utils/password-reset');
      generateSecureToken.mockReturnValue('reset-token');

      // Act
      await service.requestPasswordReset(requestDto);

      // Assert
      expect(repo.createPasswordResetToken).toHaveBeenCalledWith({
        userId: user._id,
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      });
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.stringContaining('token=reset-token'),
      );
    });

    it('should not send reset email if user not found', async () => {
      // Arrange
      repo.findUserByEmailSelectId.mockResolvedValue(null);

      // Act
      await service.requestPasswordReset(requestDto);

      // Assert
      expect(repo.createPasswordResetToken).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should not send if recent reset token exists', async () => {
      // Arrange
      const user = { ...mockUser, _id: new Types.ObjectId() };
      const recentToken = {
        _id: new Types.ObjectId(),
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      };

      repo.findUserByEmailSelectId.mockResolvedValue(user as any);
      repo.latestPasswordResetTokenByUser.mockResolvedValue(recentToken as any);

      // Act
      await service.requestPasswordReset(requestDto);

      // Assert
      expect(repo.createPasswordResetToken).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('validatePasswordResetToken', () => {
    it('should validate reset token successfully', async () => {
      // Arrange
      const user = { ...mockUser, _id: new Types.ObjectId() };
      const resetToken = {
        _id: new Types.ObjectId(),
        tokenHash: require('../utils/verification-code').sha256('valid-token'),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      repo.findUserByEmailSelectId.mockResolvedValue(user as any);
      repo.findLatestPasswordResetForUser.mockResolvedValue(resetToken as any);

      // Act
      const result = await service.validatePasswordResetToken(
        'test@example.com',
        'valid-token',
      );

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for invalid user', async () => {
      // Arrange
      repo.findUserByEmailSelectId.mockResolvedValue(null);

      // Act
      const result = await service.validatePasswordResetToken(
        'test@example.com',
        'valid-token',
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for expired token', async () => {
      // Arrange
      const user = { ...mockUser, _id: new Types.ObjectId() };
      const expiredToken = {
        _id: new Types.ObjectId(),
        tokenHash: require('../utils/verification-code').sha256('valid-token'),
        expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute ago
      };

      repo.findUserByEmailSelectId.mockResolvedValue(user as any);
      repo.findLatestPasswordResetForUser.mockResolvedValue(
        expiredToken as any,
      );

      // Act
      const result = await service.validatePasswordResetToken(
        'test@example.com',
        'valid-token',
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('resetPassword', () => {
    const resetDto: ResetPasswordDto = {
      email: 'test@example.com',
      token: 'valid-token',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };

    it('should reset password successfully', async () => {
      // Arrange
      const user = { ...mockUser, _id: new Types.ObjectId() };
      const resetToken = {
        _id: new Types.ObjectId(),
        tokenHash: require('../utils/verification-code').sha256('valid-token'),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(user as any);
      repo.latestPasswordResetTokenByUser.mockResolvedValue(resetToken as any);
      repo.saveUser.mockResolvedValue(user as any);

      // Act
      await service.resetPassword(resetDto);

      // Assert
      expect(repo.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'newpassword123',
          passwordChangedAt: expect.any(Date),
        }),
      );
      expect(repo.markPasswordResetTokenUsed).toHaveBeenCalledWith(
        resetToken._id,
      );
      expect(repo.deleteOtherPasswordResetTokens).toHaveBeenCalledWith(
        user._id,
        resetToken._id,
      );
    });

    it('should throw error for password mismatch', async () => {
      // Arrange
      const invalidDto = {
        ...resetDto,
        confirmPassword: 'different-password',
      };

      // Act & Assert
      await expect(service.resetPassword(invalidDto)).rejects.toThrow(
        new BadRequestException('auth.errors.passwordMismatch'),
      );
    });

    it('should handle expired token silently', async () => {
      // Arrange
      const user = { ...mockUser, _id: new Types.ObjectId() };
      const expiredToken = {
        _id: new Types.ObjectId(),
        tokenHash: require('../utils/verification-code').sha256('valid-token'),
        expiresAt: new Date(Date.now() - 60 * 1000),
      };

      repo.findUserByEmailWithPassword.mockResolvedValue(user as any);
      repo.latestPasswordResetTokenByUser.mockResolvedValue(
        expiredToken as any,
      );

      // Act
      await service.resetPassword(resetDto);

      // Assert - should not throw error but also not update password
      expect(repo.saveUser).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    const changeDto: ChangePasswordDto = {
      currentPassword: 'oldpassword123',
      newPassword: 'newpassword123',
      confirmPassword: 'newpassword123',
    };

    it('should change password successfully', async () => {
      // Arrange
      const hashedOldPassword = await bcrypt.hash('oldpassword123', 10);
      const user = {
        ...mockUser,
        _id: new Types.ObjectId(),
        password: hashedOldPassword,
      };

      repo.findUserByIdWithPassword.mockResolvedValue(user as any);
      repo.saveUser.mockResolvedValue(user as any);

      // Act
      await service.changePassword(String(user._id), changeDto);

      // Assert
      expect(repo.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          password: 'newpassword123',
          passwordChangedAt: expect.any(Date),
        }),
      );
      expect(repo.deletePasswordResetTokensByUser).toHaveBeenCalledWith(
        user._id,
      );
      expect(businessMetrics.incPasswordChangeCompleted).toHaveBeenCalled();
    });

    it('should throw error for password mismatch', async () => {
      // Arrange
      const invalidDto = {
        ...changeDto,
        confirmPassword: 'different-password',
      };

      // Act & Assert
      await expect(
        service.changePassword(String(mockUser._id), invalidDto),
      ).rejects.toThrow(
        new BadRequestException('auth.errors.passwordMismatch'),
      );
    });

    it('should throw error for incorrect current password', async () => {
      // Arrange
      const hashedOldPassword = await bcrypt.hash('oldpassword123', 10);
      const user = {
        ...mockUser,
        _id: new Types.ObjectId(),
        password: hashedOldPassword,
      };

      repo.findUserByIdWithPassword.mockResolvedValue(user as any);

      // Act & Assert
      await expect(
        service.changePassword(String(user._id), {
          ...changeDto,
          currentPassword: 'wrongpassword',
        }),
      ).rejects.toThrow(
        new BadRequestException('auth.errors.currentPasswordIncorrect'),
      );
    });

    it('should throw error for user not found', async () => {
      // Arrange
      repo.findUserByIdWithPassword.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.changePassword('nonexistent-id', changeDto),
      ).rejects.toThrow(new BadRequestException('auth.errors.userNotFound'));
    });
  });

  describe('ensureMerchant', () => {
    it('should create merchant for user without merchantId', async () => {
      // Arrange
      const user = {
        ...mockUser,
        _id: new Types.ObjectId(),
        emailVerified: true,
      };
      const createdMerchant = { ...mockMerchant, _id: new Types.ObjectId() };

      repo.findUserById.mockResolvedValue(user as any);
      merchantsService.ensureForUser.mockResolvedValue(createdMerchant as any);
      repo.saveUser.mockResolvedValue(user as any);
      tokenService.createAccessOnly.mockReturnValue({
        accessToken: 'access-token',
        jti: 'access-jti',
      });

      // Act
      const result = await service.ensureMerchant(String(user._id));

      // Assert
      expect(merchantsService.ensureForUser).toHaveBeenCalledWith(user._id, {
        name: 'Test User',
      });
      expect(repo.saveUser).toHaveBeenCalledWith(
        expect.objectContaining({
          merchantId: createdMerchant._id,
        }),
      );
      expect(result.accessToken).toBe('access-token');
    });

    it('should validate existing merchant', async () => {
      // Arrange
      const user = {
        ...mockUser,
        _id: new Types.ObjectId(),
        merchantId: new Types.ObjectId(),
        emailVerified: true,
      };

      repo.findUserById.mockResolvedValue(user as any);
      repo.findMerchantBasicById.mockResolvedValue(mockMerchant as any);
      tokenService.createAccessOnly.mockReturnValue({
        accessToken: 'access-token',
        jti: 'access-jti',
      });

      // Act
      const result = await service.ensureMerchant(String(user._id));

      // Assert
      expect(merchantsService.ensureForUser).not.toHaveBeenCalled();
      expect(result.accessToken).toBe('access-token');
    });

    it('should throw error for unverified email', async () => {
      // Arrange
      const user = {
        ...mockUser,
        _id: new Types.ObjectId(),
        emailVerified: false,
      };
      repo.findUserById.mockResolvedValue(user as any);

      // Act & Assert
      await expect(service.ensureMerchant(String(user._id))).rejects.toThrow(
        new BadRequestException('auth.errors.emailNotVerified'),
      );
    });

    it('should throw error for suspended merchant', async () => {
      // Arrange
      const suspendedMerchant = { ...mockMerchant, active: false };
      const user = {
        ...mockUser,
        _id: new Types.ObjectId(),
        merchantId: new Types.ObjectId(),
        emailVerified: true,
      };

      repo.findUserById.mockResolvedValue(user as any);
      repo.findMerchantBasicById.mockResolvedValue(suspendedMerchant as any);

      // Act & Assert
      await expect(service.ensureMerchant(String(user._id))).rejects.toThrow(
        new BadRequestException('تم إيقاف حساب التاجر مؤقتًا'),
      );
    });
  });

  describe('getTokenService', () => {
    it('should return token service', () => {
      // Act
      const result = service.getTokenService();

      // Assert
      expect(result).toBe(tokenService);
    });
  });

  describe('getSessionCsrfToken', () => {
    it('should return CSRF token for session', async () => {
      // Arrange
      const jti = 'session-id';
      const csrfToken = 'csrf-token';

      tokenService.getSessionCsrfToken.mockResolvedValue(csrfToken);

      // Act
      const result = await service.getSessionCsrfToken(jti);

      // Assert
      expect(tokenService.getSessionCsrfToken).toHaveBeenCalledWith(jti);
      expect(result).toBe(csrfToken);
    });
  });
});
