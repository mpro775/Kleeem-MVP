import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { TokenService } from './services/token.service';
import { User } from '../users/schemas/user.schema';
import { Merchant } from '../merchants/schemas/merchant.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let tokenService: jest.Mocked<TokenService>;
  let userModel: jest.Mocked<any>;
  let merchantModel: jest.Mocked<any>;

  const mockUser = {
    _id: 'user123',
    email: 'test@example.com',
    password: 'hashedPassword',
    role: 'MERCHANT',
    active: true,
    emailVerified: true,
    merchantId: 'merchant456',
    save: jest.fn(),
    toObject: jest.fn(),
  };

  const mockMerchant = {
    _id: 'merchant456',
    active: true,
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    const mockMerchantModel = {
      findById: jest.fn(),
      create: jest.fn(),
    };

    const mockTokenService = {
      createTokenPair: jest.fn(),
      refreshTokens: jest.fn(),
      revokeSession: jest.fn(),
      validateSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: TokenService, useValue: mockTokenService },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Merchant.name), useValue: mockMerchantModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokenService = module.get(TokenService);
    userModel = module.get(getModelToken(User.name));
    merchantModel = module.get(getModelToken(Merchant.name));

    // Reset mocks
    jest.clearAllMocks();
    mockedBcrypt.hash.mockResolvedValue('hashedPassword' as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Password123!',
      businessName: 'Test Business',
      phoneNumber: '+966501234567',
    };

    it('should register a new user successfully', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null), // No existing user
        }),
      });

      const mockCreatedUser = {
        ...mockUser,
        save: jest.fn().mockResolvedValue(mockUser),
        toObject: jest.fn().mockReturnValue(mockUser),
      };

      const mockCreatedMerchant = {
        ...mockMerchant,
        save: jest.fn().mockResolvedValue(mockMerchant),
      };

      userModel.create.mockResolvedValue(mockCreatedUser);
      merchantModel.create.mockResolvedValue(mockCreatedMerchant);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('message', 'تم إنشاء الحساب بنجاح');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(userModel.create).toHaveBeenCalled();
      expect(merchantModel.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if user already exists', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser), // User exists
        }),
      });

      await expect(service.register(registerDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(userModel.create).not.toHaveBeenCalled();
    });

    it('should handle registration errors gracefully', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      userModel.create.mockRejectedValue(new Error('Database error'));

      await expect(service.register(registerDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const sessionInfo = {
      userAgent: 'test-agent',
      ip: '127.0.0.1',
    };

    it('should login successfully with valid credentials', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      merchantModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMerchant),
        }),
      });

      const mockTokens = {
        accessToken: 'access.token',
        refreshToken: 'refresh.token',
      };

      tokenService.createTokenPair.mockResolvedValue(mockTokens);

      const result = await service.login(loginDto, sessionInfo);

      expect(result).toHaveProperty('accessToken', 'access.token');
      expect(result).toHaveProperty('user');
      expect(mockedBcrypt.compare).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(tokenService.createTokenPair).toHaveBeenCalledWith(
        {
          userId: String(mockUser._id),
          role: mockUser.role,
          merchantId: String(mockUser.merchantId),
        },
        sessionInfo,
      );
    });

    it('should throw BadRequestException for non-existent user', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.login(loginDto, sessionInfo)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for incorrect password', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto, sessionInfo)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for inactive user', async () => {
      const inactiveUser = { ...mockUser, active: false };
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(inactiveUser),
        }),
      });

      await expect(service.login(loginDto, sessionInfo)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for unverified email', async () => {
      const unverifiedUser = { ...mockUser, emailVerified: false };
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(unverifiedUser),
        }),
      });

      await expect(service.login(loginDto, sessionInfo)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for inactive merchant', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const inactiveMerchant = { ...mockMerchant, active: false };
      merchantModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(inactiveMerchant),
        }),
      });

      await expect(service.login(loginDto, sessionInfo)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for deleted merchant', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUser),
        }),
      });

      const deletedMerchant = { ...mockMerchant, deletedAt: new Date() };
      merchantModel.findById.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(deletedMerchant),
        }),
      });

      await expect(service.login(loginDto, sessionInfo)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle admin login without merchant check', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN', merchantId: null };
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(adminUser),
        }),
      });

      const mockTokens = {
        accessToken: 'access.token',
        refreshToken: 'refresh.token',
      };

      tokenService.createTokenPair.mockResolvedValue(mockTokens);

      const result = await service.login(loginDto, sessionInfo);

      expect(result).toHaveProperty('accessToken');
      expect(merchantModel.findById).not.toHaveBeenCalled();
    });
  });
});
