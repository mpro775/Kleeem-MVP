import {
  type ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';

import { ROLES_KEY } from '../decorators/roles.decorator';

import { RolesGuard } from './roles.guard';

import type { RequestWithUser } from '../interfaces/request-with-user.interface';

// Mock request interface for testing
interface MockRequest extends RequestWithUser {
  user?: {
    userId: string;
    role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
    merchantId?: string;
  };
  authUser?: {
    _id: string;
    role: 'ADMIN' | 'MERCHANT' | 'MEMBER';
    emailVerified: boolean;
    active: boolean;
    merchantId?: string;
  } | null;
  authMerchant?: {
    _id: string;
    active: boolean;
    deletedAt?: Date | null;
  } | null;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockRequest: MockRequest;

    beforeEach(() => {
      mockRequest = {
        user: {
          userId: 'test-user-id',
          role: 'MERCHANT',
          merchantId: 'test-merchant-id',
        },
        authUser: {
          _id: 'test-user-id',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'test-merchant-id',
        },
        authMerchant: {
          _id: 'test-merchant-id',
          active: true,
        },
      } as MockRequest;

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

      it('should not check roles when @Public decorator is present', () => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).not.toHaveBeenCalledWith(
          ROLES_KEY,
          [mockContext.getHandler(), mockContext.getClass()],
        );
      });
    });

    describe('Role-based authorization', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(false); // Not public
      });

      it('should allow access when no roles are required', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce([]); // required roles

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should allow access when user has required role', () => {
        const requiredRoles = ['MERCHANT', 'ADMIN'];
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(requiredRoles);

        mockRequest.user!.role = 'MERCHANT';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should allow access when user has one of the required roles', () => {
        const requiredRoles = ['ADMIN', 'MERCHANT'];
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(requiredRoles);

        mockRequest.user!.role = 'ADMIN';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should deny access when user does not have required role', () => {
        const requiredRoles = ['ADMIN'];
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(requiredRoles);

        mockRequest.user!.role = 'MERCHANT';

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Insufficient role'),
        );
      });

      it('should check roles from handler first, then class', () => {
        const handlerRoles = ['MERCHANT'];
        // const classRoles = ['ADMIN'];

        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(handlerRoles);

        mockRequest.user!.role = 'MERCHANT';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });
    });

    describe('User validation', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['MERCHANT']);
      });

      it('should work when user is missing but authUser is present', () => {
        mockRequest.user = undefined as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should work when authUser is missing but user is present', () => {
        mockRequest.authUser = undefined as any;

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should throw UnauthorizedException when both user and authUser are missing', () => {
        mockRequest.user = undefined as any;
        mockRequest.authUser = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new UnauthorizedException('Unauthorized'),
        );
      });

      it('should work with authUser when user is missing', () => {
        mockRequest.user = undefined as any;
        mockRequest.authUser = {
          _id: 'test-user-id',
          role: 'MERCHANT',
          emailVerified: true,
          active: true,
          merchantId: 'test-merchant-id',
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should work with user when authUser is missing', () => {
        mockRequest.authUser = undefined as any;
        mockRequest.user = {
          userId: 'test-user-id',
          role: 'MERCHANT',
          merchantId: 'test-merchant-id',
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Role validation logic', () => {
      it('should validate role correctly for MERCHANT role', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['MERCHANT']);

        mockRequest.user!.role = 'MERCHANT';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should validate role correctly for ADMIN role', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['ADMIN']);

        mockRequest.user!.role = 'ADMIN';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should validate role correctly for MEMBER role', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['MEMBER']);

        mockRequest.user!.role = 'MEMBER';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle multiple roles requirement', () => {
        const requiredRoles = ['ADMIN', 'MERCHANT'];
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(requiredRoles);

        mockRequest.user!.role = 'MERCHANT';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle case-sensitive role checking', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['merchant']); // lowercase

        mockRequest.user!.role = 'MERCHANT'; // uppercase

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Insufficient role'),
        );
      });
    });

    describe('Edge cases', () => {
      it('should handle null required roles', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(null);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle undefined required roles', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(undefined);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle empty roles array', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce([]);

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle string roles instead of array', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce('MERCHANT');

        mockRequest.user!.role = 'MERCHANT';

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });

    describe('Error scenarios', () => {
      beforeEach(() => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['ADMIN']);
      });

      it('should throw ForbiddenException for insufficient role', () => {
        mockRequest.user!.role = 'MERCHANT';

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Insufficient role'),
        );
      });

      it('should throw ForbiddenException when user is null but authUser has insufficient role', () => {
        mockRequest.user = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Insufficient role'),
        );
      });

      it('should throw ForbiddenException when authUser is null but user has insufficient role', () => {
        mockRequest.authUser = undefined as any;

        expect(() => guard.canActivate(mockContext)).toThrow(
          new ForbiddenException('Insufficient role'),
        );
      });

      it('should handle missing request object', () => {
        mockContext.switchToHttp = jest.fn(() => ({
          getRequest: jest.fn(() => undefined),
        })) as any;

        expect(() => guard.canActivate(mockContext)).toThrow();
      });
    });

    describe('Reflector interaction', () => {
      it('should call reflector with correct parameters', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['MERCHANT']);

        guard.canActivate(mockContext);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith('isPublic', [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);

        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          mockContext.getHandler(),
          mockContext.getClass(),
        ]);
      });

      it('should handle reflector errors gracefully', () => {
        (reflector.getAllAndOverride as jest.Mock).mockImplementation(() => {
          throw new Error('Reflector error');
        });

        expect(() => guard.canActivate(mockContext)).toThrow('Reflector error');
      });
    });

    describe('Integration scenarios', () => {
      it('should work correctly in a typical API scenario', () => {
        // Simulate a typical API endpoint that requires MERCHANT role
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['MERCHANT']);

        mockRequest.user = {
          userId: 'user-123',
          role: 'MERCHANT',
          merchantId: 'merchant-456',
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle admin-only endpoint', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['ADMIN']);

        mockRequest.user = {
          userId: 'admin-123',
          role: 'ADMIN',
          merchantId: 'merchant-456',
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });

      it('should handle member-only endpoint', () => {
        (reflector.getAllAndOverride as jest.Mock)
          .mockReturnValueOnce(false) // isPublic
          .mockReturnValueOnce(['MEMBER']);

        mockRequest.user = {
          userId: 'member-123',
          role: 'MEMBER',
          merchantId: 'merchant-456',
        };

        const result = guard.canActivate(mockContext);

        expect(result).toBe(true);
      });
    });
  });

  describe('Guard configuration', () => {
    it('should be properly configured as a guard', () => {
      expect(guard).toBeInstanceOf(Object);
      expect(typeof guard.canActivate).toBe('function');
    });

    it('should have access to reflector', () => {
      expect(guard['reflector']).toBeDefined();
      expect(typeof guard['reflector'].getAllAndOverride).toBe('function');
    });
  });

  describe('Error message consistency', () => {
    it('should use consistent error messages', () => {
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({ user: undefined })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['MERCHANT']);

      expect(() => guard.canActivate(mockContext)).toThrow(
        new UnauthorizedException('Unauthorized'),
      );
    });

    it('should use consistent forbidden messages', () => {
      const mockContext = {
        switchToHttp: jest.fn(() => ({
          getRequest: jest.fn(() => ({
            user: { userId: 'test', role: 'MEMBER' },
          })),
        })),
        getHandler: jest.fn(),
        getClass: jest.fn(),
      } as any;

      (reflector.getAllAndOverride as jest.Mock)
        .mockReturnValueOnce(false) // isPublic
        .mockReturnValueOnce(['ADMIN']);

      expect(() => guard.canActivate(mockContext)).toThrow(
        new ForbiddenException('Insufficient role'),
      );
    });
  });
});
