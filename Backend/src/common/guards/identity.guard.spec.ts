import { type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { Merchant } from '../../modules/merchants/schemas/merchant.schema';
import { User } from '../../modules/users/schemas/user.schema';

import { IdentityGuard } from './identity.guard';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import type { Model } from 'mongoose';

describe('IdentityGuard', () => {
  let guard: IdentityGuard;
  let userModel: jest.Mocked<Model<User>>;
  let merchantModel: jest.Mocked<Model<Merchant>>;
  let reflector: Reflector;

  // Mock user data
  const mockUser = {
    _id: 'user-123',
    role: 'MERCHANT',
    emailVerified: true,
    active: true,
    merchantId: 'merchant-456',
  };

  const mockMerchant = {
    _id: 'merchant-456',
    active: true,
  };

  beforeEach(async () => {
    const mockUserModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        }),
      }),
    };

    const mockMerchantModel = {
      findById: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMerchant),
        }),
      }),
    };

    const mockReflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityGuard,
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(Merchant.name),
          useValue: mockMerchantModel,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<IdentityGuard>(IdentityGuard);
    userModel = module.get(getModelToken(User.name));
    merchantModel = module.get(getModelToken(Merchant.name));
    reflector = module.get<Reflector>(Reflector);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: RequestWithUser;

    beforeEach(() => {
      mockRequest = {
        user: {
          userId: 'user-123',
          role: 'MERCHANT',
          merchantId: 'merchant-456',
        },
      } as RequestWithUser;

      mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => mockRequest),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;
    });

    describe('Public endpoints', () => {
      it('should allow access to public endpoints marked with @Public decorator', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(userModel.findById).not.toHaveBeenCalled();
      });
    });

    describe('User validation', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      });

      it('should throw UnauthorizedException when user is missing', async () => {
        mockRequest.user = undefined as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('Unauthorized'),
        );
      });

      it('should throw UnauthorizedException when userId is missing', async () => {
        mockRequest.user = { role: 'MERCHANT' } as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('Unauthorized'),
        );
      });

      it('should find user by ID from JWT payload', async () => {
        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(userModel.findById).toHaveBeenCalledWith('user-123');
      });

      it('should select correct fields from user', async () => {
        const mockSelect = jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockUser),
        });

        userModel.findById.mockReturnValue({
          select: mockSelect,
        } as any);

        await guard.canActivate(mockContext);

        expect(mockSelect).toHaveBeenCalledWith(
          'role emailVerified active merchantId',
        );
      });

      it('should throw UnauthorizedException when user not found', async () => {
        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('الحساب غير موجود'),
        );
      });

      it('should throw UnauthorizedException when user has no role', async () => {
        const userWithoutRole = { ...mockUser, role: undefined };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithoutRole),
          }),
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('بيانات الحساب غير مكتملة'),
        );
      });
    });

    describe('User data mapping', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        } as any);
      });

      it('should map user data to authUser correctly', async () => {
        await guard.canActivate(mockContext);

        expect(mockRequest.authUser).toEqual({
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        });
      });

      it('should handle null merchantId', async () => {
        const userWithoutMerchant = { ...mockUser, merchantId: null };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithoutMerchant),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authUser).toEqual({
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: null,
        });
      });

      it('should handle undefined merchantId', async () => {
        const userWithoutMerchant = { ...mockUser, merchantId: undefined };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithoutMerchant),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authUser).toEqual({
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: null,
        });
      });

      it('should handle falsy emailVerified', async () => {
        const userWithFalseEmailVerified = {
          ...mockUser,
          emailVerified: false,
        };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithFalseEmailVerified),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authUser!.emailVerified).toBe(false);
      });

      it('should handle falsy active status', async () => {
        const userWithFalseActive = { ...mockUser, active: false };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithFalseActive),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authUser!.active).toBe(false);
      });
    });

    describe('Merchant data handling', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        } as any);
      });

      it('should fetch merchant data when user has merchantId', async () => {
        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMerchant),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(merchantModel.findById).toHaveBeenCalledWith('merchant-456');
      });

      it('should select correct fields from merchant', async () => {
        const mockSelect = jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockMerchant),
        });

        merchantModel.findById.mockReturnValue({
          select: mockSelect,
        } as any);

        await guard.canActivate(mockContext);

        expect(mockSelect).toHaveBeenCalledWith('active deletedAt');
      });

      it('should map merchant data to authMerchant correctly', async () => {
        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMerchant),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authMerchant).toEqual({
          _id: 'merchant-456',
          active: true,
          deletedAt: null,
        });
      });

      it('should set authMerchant to null when merchant not found', async () => {
        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authMerchant).toBeNull();
      });

      it('should handle merchant with deletedAt', async () => {
        const merchantWithDeletedAt = {
          ...mockMerchant,
          deletedAt: new Date(),
        };

        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(merchantWithDeletedAt),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authMerchant).toEqual({
          _id: 'merchant-456',
          active: true,
          deletedAt: merchantWithDeletedAt.deletedAt,
        });
      });

      it('should handle merchant with false active status', async () => {
        const inactiveMerchant = { ...mockMerchant, active: false };

        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(inactiveMerchant),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authMerchant).toEqual({
          _id: 'merchant-456',
          active: false,
          deletedAt: null,
        });
      });

      it('should set authMerchant to null when user has no merchantId', async () => {
        const userWithoutMerchant = { ...mockUser, merchantId: null };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithoutMerchant),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(mockRequest.authMerchant).toBeNull();
        expect(merchantModel.findById).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      });

      it('should handle database errors gracefully', async () => {
        userModel.findById.mockImplementation(() => {
          throw new Error('Database connection failed');
        });

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Database connection failed',
        );
      });

      it('should handle malformed request object', async () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => null),
        })) as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow();
      });

      it('should handle missing JWT payload', async () => {
        mockRequest.user = {} as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('Unauthorized'),
        );
      });
    });

    describe('Integration scenarios', () => {
      it('should work correctly in a typical user authentication flow', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        } as any);

        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMerchant),
          }),
        } as any);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest.authUser).toBeDefined();
        expect(mockRequest.authMerchant).toBeDefined();
      });

      it('should handle user without merchant correctly', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        const userWithoutMerchant = { ...mockUser, merchantId: null };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithoutMerchant),
          }),
        } as any);

        const result = await guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(mockRequest.authUser).toBeDefined();
        expect(mockRequest.authMerchant).toBeNull();
      });
    });

    describe('Performance considerations', () => {
      it('should handle rapid successive calls', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        } as any);

        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMerchant),
          }),
        } as any);

        const results: boolean[] = [];
        for (let i = 0; i < 100; i++) {
          results.push(await guard.canActivate(mockContext));
        }

        expect(results).toHaveLength(100);
        expect(results.every((result) => result === true)).toBe(true);
      });
    });

    describe('Guard properties and methods', () => {
      it('should be a proper guard implementation', () => {
        expect(guard).toBeInstanceOf(Object);
        expect(typeof guard.canActivate).toBe('function');
      });

      it('should have access to userModel', () => {
        expect(guard['userModel']).toBeDefined();
        expect(guard['userModel']).toBeInstanceOf(Object);
      });

      it('should have access to merchantModel', () => {
        expect(guard['merchantModel']).toBeDefined();
        expect(guard['merchantModel']).toBeInstanceOf(Object);
      });

      it('should have access to reflector', () => {
        expect(guard['reflector']).toBeDefined();
        expect(guard['reflector']).toBeInstanceOf(Object);
      });
    });

    describe('Async behavior', () => {
      it('should return Promise<boolean>', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        } as any);

        merchantModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockMerchant),
          }),
        } as any);

        const result = guard.canActivate(mockContext);

        expect(result).toBeInstanceOf(Promise);

        const resolvedResult = await result;
        expect(resolvedResult).toBe(true);
      });

      it('should handle Promise rejection correctly', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        userModel.findById.mockImplementation(() => {
          throw new Error('Database error');
        });

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Database error',
        );
      });
    });

    describe('Error message consistency', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);
      });

      it('should use consistent error messages for missing user', async () => {
        mockRequest.user = undefined as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('Unauthorized'),
        );
      });

      it('should use consistent error messages for missing userId', async () => {
        mockRequest.user = { role: 'MERCHANT' } as any;

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('Unauthorized'),
        );
      });

      it('should use consistent error messages for user not found', async () => {
        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(null),
          }),
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('الحساب غير موجود'),
        );
      });

      it('should use consistent error messages for incomplete user data', async () => {
        const userWithoutRole = { ...mockUser, role: undefined };

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(userWithoutRole),
          }),
        } as any);

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          new UnauthorizedException('بيانات الحساب غير مكتملة'),
        );
      });
    });

    describe('Reflector interaction', () => {
      it('should call reflector with correct parameters', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false);

        userModel.findById.mockReturnValue({
          select: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue(mockUser),
          }),
        } as any);

        await guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should handle reflector errors gracefully', async () => {
        (reflector.getAllAndOverride as jest.Mock).mockImplementation(() => {
          throw new Error('Reflector error');
        });

        await expect(guard.canActivate(mockContext)).rejects.toThrow(
          'Reflector error',
        );
      });
    });
  });
});
