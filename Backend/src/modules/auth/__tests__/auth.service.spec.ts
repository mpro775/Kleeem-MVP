import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';
import { mockDeep } from 'jest-mock-extended';

import { TranslationService } from '../../../common/services/translation.service';
import { BusinessMetrics } from '../../../metrics/business.metrics';
import { MailService } from '../../mail/mail.service';
import { MerchantsService } from '../../merchants/merchants.service';
import { AuthService } from '../auth.service';
import { TokenService } from '../services/token.service';

describe('AuthService', () => {
  let service: AuthService;
  let authRepository: any;
  let tokenService: jest.Mocked<TokenService>;
  let mailService: jest.Mocked<MailService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: mockDeep<JwtService>(),
        },
        {
          provide: 'AuthRepository',
          useValue: mockDeep(),
        },
        {
          provide: TokenService,
          useValue: mockDeep<TokenService>(),
        },
        {
          provide: MailService,
          useValue: mockDeep<MailService>(),
        },
        {
          provide: MerchantsService,
          useValue: mockDeep<MerchantsService>(),
        },
        {
          provide: TranslationService,
          useValue: mockDeep<TranslationService>(),
        },
        {
          provide: BusinessMetrics,
          useValue: mockDeep<BusinessMetrics>(),
        },
        {
          provide: ConfigService,
          useValue: mockDeep<ConfigService>(),
        },
        {
          provide: 'CACHE_MANAGER',
          useValue: mockDeep(),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    authRepository = module.get('AuthRepository');
    tokenService = module.get(TokenService);
    mailService = module.get(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
        confirmPassword: 'password123',
      };

      const mockUser = {
        id: 'user123',
        email: registerDto.email,
        name: registerDto.name,
        isEmailVerified: false,
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      authRepository.findByEmail.mockResolvedValue(null);
      authRepository.create.mockResolvedValue(mockUser as any);
      tokenService.createTokenPair.mockResolvedValue(mockTokens);
      mailService.sendVerificationEmail.mockResolvedValue();

      const result = await service.register(registerDto as any);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(registerDto.email);
      expect(authRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: registerDto.email,
          name: registerDto.name,
        }),
      );
    });

    it('should throw ConflictException for existing email', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Test User',
        confirmPassword: 'password123',
      };

      const existingUser = {
        id: 'existing123',
        email: registerDto.email,
      };

      authRepository.findByEmail.mockResolvedValue(existingUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        'User with this email already exists',
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user123',
        email: loginDto.email,
        password: '$2b$10$hashedpassword',
        isEmailVerified: true,
        name: 'Test User',
      };

      const mockTokens = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      authRepository.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);
      tokenService.createTokenPair.mockResolvedValue(mockTokens);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw BadRequestException for invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockUser = {
        id: 'user123',
        email: loginDto.email,
        password: '$2b$10$hashedpassword',
      };

      authRepository.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(false);

      await expect(service.login(loginDto as any)).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should throw BadRequestException for unverified email', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user123',
        email: loginDto.email,
        password: '$2b$10$hashedpassword',
        isEmailVerified: false,
      };

      authRepository.findByEmail.mockResolvedValue(mockUser as any);
      jest.spyOn(require('bcrypt'), 'compare').mockResolvedValue(true);

      await expect(service.login(loginDto as any)).rejects.toThrow(
        'Please verify your email before logging in',
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email with valid code', async () => {
      const verifyDto = {
        email: 'test@example.com',
        code: '123456',
      };

      const mockUser = {
        id: 'user123',
        email: verifyDto.email,
        verificationCode: '123456',
        verificationCodeExpires: new Date(Date.now() + 60000), // 1 minute from now
        isEmailVerified: false,
      };

      authRepository.findByEmail.mockResolvedValue(mockUser as any);
      authRepository.updateById.mockResolvedValue({
        ...mockUser,
        isEmailVerified: true,
      } as any);

      const result = await service.verifyEmail(verifyDto);

      expect((result as any).success).toBe(true);
      expect((result as any).message).toContain('Email verified successfully');
    });

    it('should throw BadRequestException for invalid verification code', async () => {
      const verifyDto = {
        email: 'test@example.com',
        code: 'wrongcode',
      };

      const mockUser = {
        id: 'user123',
        email: verifyDto.email,
        verificationCode: '123456',
        verificationCodeExpires: new Date(Date.now() + 60000),
      };

      authRepository.findByEmail.mockResolvedValue(mockUser as any);

      await expect(service.verifyEmail(verifyDto)).rejects.toThrow(
        'Invalid verification code',
      );
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const refreshToken = 'refresh-token-123';

      tokenService.revokeRefreshToken.mockResolvedValue();

      const result = await service.logout(refreshToken as any);

      expect(result.message).toBe('Logged out successfully');
      expect(
        tokenService.revokeRefreshToken.bind(tokenService),
      ).toHaveBeenCalledWith(refreshToken);
    });
  });
});
