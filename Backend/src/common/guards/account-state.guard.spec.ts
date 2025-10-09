import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { AccountStateGuard } from './account-state.guard';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';

describe('AccountStateGuard', () => {
  let guard: AccountStateGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountStateGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AccountStateGuard>(AccountStateGuard);
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
        cookies: {},
        signedCookies: {},
        get: jest.fn(),
        header: jest.fn(),
      } as unknown as RequestWithUser;

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
      });
    });

    describe('Account state validation', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail
      });

      it('should allow access for active user with verified email', () => {
        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should deny access when user is missing', () => {
        mockRequest.authUser = undefined as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(false);
      });

      it('should throw ForbiddenException when account is inactive', () => {
        mockRequest.authUser!.active = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('الحساب معطّل، تواصل مع الدعم'),
        );
      });

      it('should throw ForbiddenException when email is not verified', () => {
        mockRequest.authUser!.emailVerified = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException(
            'يجب تفعيل البريد الإلكتروني قبل استخدام هذه الميزة',
          ),
        );
      });

      it('should throw ForbiddenException when both account is inactive and email not verified', () => {
        mockRequest.authUser!.active = false;
        mockRequest.authUser!.emailVerified = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('الحساب معطّل، تواصل مع الدعم'),
        );
      });
    });

    describe('Allow unverified email scenarios', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(true); // allowUnverifiedEmail
      });

      it('should allow access for unverified email when decorator allows it', () => {
        mockRequest.authUser!.emailVerified = false;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should still check account active status even when email verification is allowed', () => {
        mockRequest.authUser!.emailVerified = false;
        mockRequest.authUser!.active = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('الحساب معطّل، تواصل مع الدعم'),
        );
      });
    });

    describe('Edge cases', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail
      });

      it('should handle null active status', () => {
        mockRequest.authUser!.active = null as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('الحساب معطّل، تواصل مع الدعم'),
        );
      });

      it('should handle undefined active status', () => {
        mockRequest.authUser!.active = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('الحساب معطّل، تواصل مع الدعم'),
        );
      });

      it('should handle null emailVerified status', () => {
        mockRequest.authUser!.emailVerified = null as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException(
            'يجب تفعيل البريد الإلكتروني قبل استخدام هذه الميزة',
          ),
        );
      });

      it('should handle undefined emailVerified status', () => {
        mockRequest.authUser!.emailVerified = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException(
            'يجب تفعيل البريد الإلكتروني قبل استخدام هذه الميزة',
          ),
        );
      });
    });

    describe('Integration scenarios', () => {
      it('should work correctly in a typical user API scenario', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail

        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle suspended account scenario', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail

        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: false,
          merchantId: 'merchant-456',
        };

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('الحساب معطّل، تواصل مع الدعم'),
        );
      });

      it('should handle unverified email scenario', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail

        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: false,
          active: true,
          merchantId: 'merchant-456',
        };

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException(
            'يجب تفعيل البريد الإلكتروني قبل استخدام هذه الميزة',
          ),
        );
      });
    });

    describe('Performance considerations', () => {
      it('should handle rapid successive calls', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail

        mockRequest.authUser = {
          _id: 'user-123',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'merchant-456',
        };

        const results: boolean[] = [];
        for (let i = 0; i < 1000; i++) {
          results.push(guard.canActivate(mockContext));
        }

        expect(results).toHaveLength(1000);
        expect(results.every((result) => result === true)).toBe(true);
      });
    });

    describe('Error message consistency', () => {
      it('should use consistent error messages for inactive account', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail

        mockRequest.authUser!.active = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('الحساب معطّل، تواصل مع الدعم'),
        );
      });

      it('should use consistent error messages for unverified email', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(false); // allowUnverifiedEmail

        mockRequest.authUser!.emailVerified = false;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException(
            'يجب تفعيل البريد الإلكتروني قبل استخدام هذه الميزة',
          ),
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
          .mockReturnValueOnce(false); // allowUnverifiedEmail

        guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          'allowUnverifiedEmail',
          [mockContext.getHandler(), mockContext.getClass()],
        );
      });
    });
  });
});
