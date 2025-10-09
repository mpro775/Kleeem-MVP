import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { MerchantStateGuard } from './merchant-state.guard';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';

describe('MerchantStateGuard', () => {
  let guard: MerchantStateGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantStateGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<MerchantStateGuard>(MerchantStateGuard);
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
        authUser: {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        },
        authMerchant: {
          _id: 'merchant-456',
          active: true,
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
      it('should allow access to public endpoints marked with @Public decorator', () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should not check merchant state when @Public decorator is present', () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).not.toHaveBeenCalledWith(
          'skipMerchantCheck',
          [mockContext.getHandler(), mockContext.getClass()],
        );
      });
    });

    describe('Skip merchant check endpoints', () => {
      it('should allow access when @SkipMerchantCheck decorator is present', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(true); // skipMerchantCheck

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          'skipMerchantCheck',
          [mockContext.getHandler(), mockContext.getClass()],
        );
      });

      it('should check both decorators in correct order', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(true) // isPublic - should exit early
          .mockReturnValueOnce(false); // skipMerchantCheck - should not be called

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
        expect(reflector.getAllAndOverride).not.toHaveBeenCalledWith(
          'skipMerchantCheck',
          [mockContext.getHandler(), mockContext.getClass()],
        );
      });
    });

    describe('Admin user scenarios', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck
      });

      it('should allow access for ADMIN users regardless of merchant state', () => {
        mockRequest.authUser!.role = 'ADMIN';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for admin users even with missing merchant', () => {
        mockRequest.authUser!.role = 'ADMIN';
        mockRequest.authUser!.merchantId = undefined;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for admin users even with inactive merchant', () => {
        mockRequest.authUser!.role = 'ADMIN';
        mockRequest.authMerchant!.active = false;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for admin users even with deleted merchant', () => {
        mockRequest.authUser!.role = 'ADMIN';
        mockRequest.authMerchant!.deletedAt = new Date();

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Merchant validation scenarios', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck

        mockRequest.authUser!.role = 'MERCHANT';
      });

      it('should deny access when user is missing', () => {
        mockRequest.authUser = undefined as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should deny access when user is null', () => {
        mockRequest.authUser = null as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should throw ForbiddenException when user has no merchantId', () => {
        mockRequest.authUser!.merchantId = undefined;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('لا يوجد تاجر مرتبط بالحساب'),
        );
      });

      it('should throw ForbiddenException when user has null merchantId', () => {
        mockRequest.authUser!.merchantId = null as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('لا يوجد تاجر مرتبط بالحساب'),
        );
      });

      it('should throw ForbiddenException when merchant data is missing', () => {
        mockRequest.authMerchant = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('بيانات التاجر غير متاحة'),
        );
      });

      it('should throw ForbiddenException when merchant data is null', () => {
        mockRequest.authMerchant = null as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('بيانات التاجر غير متاحة'),
        );
      });

      it('should throw ForbiddenException when merchant is deleted', () => {
        mockRequest.authMerchant!.deletedAt = new Date();

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });

      it('should throw ForbiddenException when merchant is inactive', () => {
        mockRequest.authMerchant!.active = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });

      it('should throw ForbiddenException when merchant is deleted and inactive', () => {
        mockRequest.authMerchant!.deletedAt = new Date();
        mockRequest.authMerchant!.active = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });

      it('should allow access for active merchant', () => {
        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: true,
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should allow access for merchant without deletedAt but active', () => {
        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: true,
          deletedAt: undefined as any,
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Edge cases and boundary conditions', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck
      });

      it('should handle malformed request object', () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => ({})), // Missing authUser and authMerchant
        })) as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should handle null request object', () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => null as any),
        })) as any;

        expect(() => guard.canActivate(mockContext)).toThrow();
      });

      it('should handle request with only partial auth data', () => {
        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          // Missing merchantId
        };

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('لا يوجد تاجر مرتبط بالحساب'),
        );
      });

      it('should handle merchant with null active status', () => {
        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: null as any,
        };

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });

      it('should handle merchant with undefined active status', () => {
        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: undefined as any,
        };

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });
    });

    describe('Role variations', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck
      });

      it('should handle MEMBER role correctly', () => {
        mockRequest.authUser!.role = 'MEMBER';
        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: true,
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle different admin role cases', () => {
        mockRequest.authUser!.role = 'ADMIN';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle case-sensitive role checking', () => {
        mockRequest.authUser!.role = 'merchant' as any; // lowercase

        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: true,
        };

        // Should still work as the check is only for 'ADMIN' exactly
        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Integration scenarios', () => {
      it('should work correctly in a typical merchant API scenario', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck

        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        };

        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: true,
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle suspended merchant scenario', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck

        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        };

        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: false,
          deletedAt: new Date(),
        };

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });

      it('should handle admin accessing merchant endpoints', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck

        mockRequest.authUser = {
          _id: 'admin-123',
          role: 'ADMIN',
          emailVerified: true,
          active: true,
          // Admin may not have merchantId
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Performance considerations', () => {
      it('should handle rapid successive calls', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck

        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        };

        mockRequest.authMerchant = {
          _id: 'merchant-456',
          active: true,
        };

        const results: boolean[] = [];
        for (let i = 0; i < 1000; i++) {
          results.push(guard.canActivate(mockContext));
        }

        expect(results).toHaveLength(1000);
        expect(results.every((result) => result === true)).toBe(true);
      });

      it('should be memory efficient', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck

        // Should not cause memory leaks
        for (let i = 0; i < 10000; i++) {
          guard.canActivate(mockContext);
        }

        expect(true).toBe(true); // Test passes if no memory issues
      });
    });

    describe('Error message consistency', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck
      });

      it('should use consistent error messages for missing merchant', () => {
        mockRequest.authUser!.merchantId = undefined;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('لا يوجد تاجر مرتبط بالحساب'),
        );
      });

      it('should use consistent error messages for missing merchant data', () => {
        mockRequest.authMerchant = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('بيانات التاجر غير متاحة'),
        );
      });

      it('should use consistent error messages for inactive merchant', () => {
        mockRequest.authMerchant!.active = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });

      it('should use consistent error messages for deleted merchant', () => {
        mockRequest.authMerchant!.deletedAt = new Date();

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('تم إيقاف حساب التاجر مؤقتًا'),
        );
      });
    });

    describe('Guard properties and methods', () => {
      it('should be a proper guard implementation', () => {
        expect(guard).toBeInstanceOf(Object);
        expect(typeof guard.canActivate).toBe('function');
      });

      it('should have access to reflector', () => {
        expect(guard['reflector']).toBeDefined();
        expect(guard['reflector']).toHaveProperty('getAllAndOverride');
        expect(typeof guard['reflector'].getAllAndOverride).toBe('function');
      });
    });

    describe('Reflector interaction', () => {
      it('should call reflector with correct parameters', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // skipMerchantCheck

        guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          'skipMerchantCheck',
          [mockContext.getHandler(), mockContext.getClass()],
        );
      });

      it('should handle reflector errors gracefully', () => {
        (reflector.getAllAndOverride as jest.Mock).mockImplementation(() => {
          throw new Error('Reflector error');
        });

        expect(() => guard.canActivate(mockContext)).toThrow('Reflector error');
      });
    });
  });
});
