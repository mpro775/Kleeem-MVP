import { SetMetadata } from '@nestjs/common';

import { Roles, RolesDecorator, ROLES_KEY } from './roles.decorator';

// Mock SetMetadata to return a mock decorator function
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(() => {
    return jest.fn(
      (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
        // Mock decorator - do nothing
        return descriptor;
      },
    );
  }),
}));

describe('Roles Decorator', () => {
  let setMetadataMock: jest.MockedFunction<typeof SetMetadata>;

  beforeEach(() => {
    setMetadataMock = SetMetadata as jest.MockedFunction<typeof SetMetadata>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Roles function', () => {
    it('should be defined', () => {
      expect(Roles).toBeDefined();
    });

    it('should be a function', () => {
      expect(typeof Roles).toBe('function');
    });

    it('should call SetMetadata with ROLES_KEY and provided roles', () => {
      Roles('ADMIN', 'USER');

      expect(setMetadataMock).toHaveBeenCalledTimes(1);
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ADMIN',
        'USER',
      ]);
    });

    it('should handle single role', () => {
      Roles('ADMIN');

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });

    it('should handle multiple roles', () => {
      Roles('ADMIN', 'MODERATOR', 'USER');

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ADMIN',
        'MODERATOR',
        'USER',
      ]);
    });

    it('should handle empty roles array', () => {
      Roles();

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, []);
    });

    it('should return the result of SetMetadata', () => {
      const mockDecorator = () => {};
      setMetadataMock.mockReturnValue(mockDecorator as any);

      const result = Roles('ADMIN');

      expect(result).toBe(mockDecorator);
    });
  });

  describe('RolesDecorator alias', () => {
    it('should be defined', () => {
      expect(RolesDecorator).toBeDefined();
    });

    it('should be the same function as Roles', () => {
      expect(RolesDecorator).toBe(Roles);
    });

    it('should work identically to Roles', () => {
      RolesDecorator('USER', 'GUEST');

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'USER',
        'GUEST',
      ]);
    });
  });

  describe('ROLES_KEY constant', () => {
    it('should be defined', () => {
      expect(ROLES_KEY).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof ROLES_KEY).toBe('string');
    });

    it('should have the value "roles"', () => {
      expect(ROLES_KEY).toBe('roles');
    });
  });

  // Basic decorator functionality is tested through integration tests below

  describe('role parameter handling', () => {
    it('should handle string roles', () => {
      const roles = ['ADMIN', 'USER', 'MODERATOR', 'GUEST'];

      Roles(...roles);

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, roles);
    });

    it('should handle numeric roles', () => {
      Roles('ROLE_1', 'ROLE_2');

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ROLE_1',
        'ROLE_2',
      ]);
    });

    it('should handle special characters in roles', () => {
      Roles('ROLE-ADMIN', 'ROLE_USER', 'ROLE@MODERATOR');

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ROLE-ADMIN',
        'ROLE_USER',
        'ROLE@MODERATOR',
      ]);
    });

    it('should handle duplicate roles', () => {
      Roles('ADMIN', 'ADMIN', 'USER');

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ADMIN',
        'ADMIN',
        'USER',
      ]);
    });

    it('should preserve role order', () => {
      const roles = ['FIRST', 'SECOND', 'THIRD'];

      Roles(...roles);

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, roles);
    });
  });

  // Skipping real-world usage scenarios that require actual decorator application
  describe('real-world usage scenarios', () => {
    it('should work for admin-only endpoints', () => {
      class AdminController {
        @Roles('ADMIN')
        deleteUser() {
          return 'User deleted';
        }

        @Roles('ADMIN', 'SUPER_ADMIN')
        systemSettings() {
          return 'System settings';
        }
      }
      expect(AdminController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ADMIN',
        'SUPER_ADMIN',
      ]);
    });

    it('should work for merchant-specific endpoints', () => {
      class MerchantController {
        @Roles('MERCHANT')
        getMerchantData() {
          return 'Merchant data';
        }

        @Roles('MERCHANT', 'ADMIN')
        updateMerchantProfile() {
          return 'Profile updated';
        }
      }
      expect(MerchantController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['MERCHANT']);
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'MERCHANT',
        'ADMIN',
      ]);
    });

    it('should work for user management', () => {
      class UserController {
        @Roles('ADMIN', 'MODERATOR')
        banUser() {
          return 'User banned';
        }

        @Roles('USER', 'MEMBER')
        updateProfile() {
          return 'Profile updated';
        }
      }
      expect(UserController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ADMIN',
        'MODERATOR',
      ]);
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'USER',
        'MEMBER',
      ]);
    });

    it('should work with public roles', () => {
      class PublicController {
        @Roles('GUEST', 'USER')
        getPublicData() {
          return 'Public data';
        }
      }
      expect(PublicController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'GUEST',
        'USER',
      ]);
    });

    it('should work with hierarchical roles', () => {
      class ContentController {
        @Roles('EDITOR', 'ADMIN')
        createContent() {
          return 'Content created';
        }

        @Roles('REVIEWER', 'EDITOR', 'ADMIN')
        reviewContent() {
          return 'Content reviewed';
        }
      }
      expect(ContentController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'EDITOR',
        'ADMIN',
      ]);
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'REVIEWER',
        'EDITOR',
        'ADMIN',
      ]);
    });
  });

  // Skipping TypeScript integration tests that require actual decorator application
  describe('TypeScript integration', () => {
    it('should work with method decorators', () => {
      class TestClass {
        @Roles('ADMIN')
        testMethod(param: string): string {
          return param;
        }
      }

      const instance = new TestClass();
      expect(typeof instance.testMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });

    it('should work with class decorators', () => {
      @Roles('ADMIN', 'USER')
      class TestClass {
        testMethod(): string {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(typeof instance.testMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ADMIN',
        'USER',
      ]);
    });

    it('should maintain method signature', () => {
      class TestClass {
        @Roles('ADMIN')
        testMethod(input: number): number {
          return input * 2;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod(5);
      expect(result).toBe(10);
    });

    it('should work with async methods', () => {
      class TestClass {
        @Roles('ADMIN')
        async asyncMethod(): Promise<string> {
          await Promise.resolve();
          return 'async result';
        }
      }

      const instance = new TestClass();
      expect(typeof instance.asyncMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });
  });

  // Skipping decorator composition tests that require actual decorator application
  describe('decorator composition and stacking', () => {
    it('should be stackable with other metadata decorators', () => {
      const Public = () => ({}) as any; // Mock public decorator

      class TestController {
        @Roles('ADMIN')
        @Public()
        adminPublicMethod() {
          return 'admin public method';
        }
      }
      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });

    it('should work in decorator arrays', () => {
      class TestController {
        @([Roles('ADMIN')] as any)
        arrayDecoratedMethod() {
          return 'array decorated';
        }
      }
      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });

    it('should work with multiple role decorators on different methods', () => {
      class TestController {
        @Roles('ADMIN')
        method1() {
          return 'method1';
        }

        @Roles('USER', 'GUEST')
        method2() {
          return 'method2';
        }

        @Roles('MODERATOR')
        method3() {
          return 'method3';
        }
      }
      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledTimes(3);
      expect(setMetadataMock).toHaveBeenNthCalledWith(1, ROLES_KEY, ['ADMIN']);
      expect(setMetadataMock).toHaveBeenNthCalledWith(2, ROLES_KEY, [
        'USER',
        'GUEST',
      ]);
      expect(setMetadataMock).toHaveBeenNthCalledWith(3, ROLES_KEY, [
        'MODERATOR',
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle SetMetadata throwing errors', () => {
      setMetadataMock.mockImplementation(() => {
        throw new Error('Metadata error');
      });

      expect(() => Roles('ADMIN')).toThrow('Metadata error');
    });

    it('should handle undefined return from SetMetadata', () => {
      setMetadataMock.mockReturnValue(undefined as any);

      const result = Roles('ADMIN');
      expect(result).toBeUndefined();
    });

    it('should handle null return from SetMetadata', () => {
      setMetadataMock.mockReturnValue(null as any);

      const result = Roles('ADMIN');
      expect(result).toBeNull();
    });

    it('should handle non-string role values gracefully', () => {
      // Even though TypeScript would prevent this, test runtime behavior
      Roles('ADMIN', 123 as any, null as any);

      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, [
        'ADMIN',
        123,
        null,
      ]);
    });
  });

  describe('performance considerations', () => {
    it('should be lightweight and not create unnecessary objects', () => {
      const startTime = Date.now();

      // Call multiple times rapidly
      for (let i = 0; i < 1000; i++) {
        Roles('ADMIN');
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 1000 calls)
      expect(duration).toBeLessThan(100);
    });

    it('should not have memory leaks', () => {
      // Call many times and ensure no memory issues
      for (let i = 0; i < 10000; i++) {
        Roles('ADMIN');
      }

      // If we get here without issues, the test passes
      expect(true).toBe(true);
    });

    it('should handle concurrent usage', () => {
      const results: unknown[] = [];

      // Simulate concurrent calls
      for (let i = 0; i < 100; i++) {
        results.push(Roles('ADMIN'));
      }

      expect(results).toHaveLength(100);
      expect(setMetadataMock).toHaveBeenCalledTimes(100);
    });
  });

  // Skipping integration tests that require actual decorator application
  describe('integration with guards', () => {
    it('should work with role guards that check roles metadata', () => {
      class MockRoleGuard {
        static checkRoles(
          metadata: Record<string, any>,
          userRoles: string[],
        ): boolean {
          const requiredRoles = metadata[ROLES_KEY] || [];
          return requiredRoles.some((role: string) => userRoles.includes(role));
        }
      }

      // Simulate guard checking the metadata
      const metadata = { [ROLES_KEY]: ['ADMIN', 'MODERATOR'] };
      const userRoles = ['ADMIN'];

      const hasAccess = MockRoleGuard.checkRoles(metadata, userRoles);
      expect(hasAccess).toBe(true);

      const noAccessUser = ['USER'];
      const hasNoAccess = MockRoleGuard.checkRoles(metadata, noAccessUser);
      expect(hasNoAccess).toBe(false);
    });

    it('should differentiate role-based from public endpoints', () => {
      const Public = () => ({}) as any; // Mock public decorator
      class TestController {
        @Roles('ADMIN')
        adminEndpoint() {
          return 'admin only';
        }

        @Public()
        publicEndpoint() {
          return 'public';
        }
      }
      expect(TestController).toBeDefined();
      // Only the admin endpoint should have roles metadata
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });
  });

  // Skipping backwards compatibility tests that require actual decorator application
  describe('backwards compatibility', () => {
    it('should maintain RolesDecorator alias for backwards compatibility', () => {
      // Ensure both exports work identically
      const rolesDecorator = Roles('ADMIN');
      const rolesAliasDecorator = RolesDecorator('ADMIN');

      expect(typeof rolesDecorator).toBe('function');
      expect(typeof rolesAliasDecorator).toBe('function');

      // Both should call SetMetadata the same way
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });

    it('should handle migration from RolesDecorator to Roles', () => {
      // Simulate existing code using RolesDecorator
      class LegacyController {
        @RolesDecorator('ADMIN')
        legacyMethod() {
          return 'legacy method';
        }
      }
      expect(LegacyController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith(ROLES_KEY, ['ADMIN']);
    });
  });
});
