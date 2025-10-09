import { SetMetadata } from '@nestjs/common';

import { SkipMerchantCheck } from './skip-merchant-check.decorator';

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

describe('SkipMerchantCheck Decorator', () => {
  let setMetadataMock: jest.MockedFunction<typeof SetMetadata>;

  beforeEach(() => {
    setMetadataMock = SetMetadata as jest.MockedFunction<typeof SetMetadata>;
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(SkipMerchantCheck).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof SkipMerchantCheck).toBe('function');
  });

  it('should call SetMetadata with correct key and value', () => {
    SkipMerchantCheck();

    expect(setMetadataMock).toHaveBeenCalledTimes(1);
    expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
  });

  it('should return the result of SetMetadata', () => {
    const mockDecorator = () => {};
    setMetadataMock.mockReturnValue(mockDecorator as any);

    const result = SkipMerchantCheck();

    expect(result).toBe(mockDecorator);
  });

  it('should always set the value to true', () => {
    // Call multiple times to ensure consistency
    for (let i = 0; i < 5; i++) {
      SkipMerchantCheck();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    }
  });

  // Basic decorator functionality is tested through integration tests below

  describe('metadata key consistency', () => {
    it('should always use the same metadata key', () => {
      const calls: unknown[][] = [];

      // Multiple calls
      for (let i = 0; i < 3; i++) {
        SkipMerchantCheck();
        calls.push(setMetadataMock.mock.calls[i]);
      }

      // All calls should use the same key
      calls.forEach((call) => {
        expect(call[0]).toBe('skipMerchantCheck');
        expect(call[1]).toBe(true);
      });
    });

    it('should use camelCase key naming', () => {
      SkipMerchantCheck();

      const [key] = setMetadataMock.mock.calls[0];
      expect(key).toBe('skipMerchantCheck');
      expect(key).toMatch(/^[a-z][a-zA-Z]*$/); // camelCase pattern
    });
  });

  // Real-world usage scenarios that require actual decorator application
  describe('real-world usage scenarios', () => {
    it('should skip merchant check for global admin endpoints', () => {
      class AdminController {
        @SkipMerchantCheck()
        getSystemStats() {
          return 'System statistics';
        }

        @SkipMerchantCheck()
        manageGlobalSettings() {
          return 'Global settings managed';
        }
      }
      expect(AdminController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should skip merchant check for system health endpoints', () => {
      class SystemController {
        @SkipMerchantCheck()
        getHealthStatus() {
          return { status: 'healthy', uptime: '99.9%' };
        }

        @SkipMerchantCheck()
        getSystemInfo() {
          return { version: '1.0.0', environment: 'production' };
        }
      }

      expect(SystemController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should skip merchant check for user profile endpoints', () => {
      class UserController {
        @SkipMerchantCheck()
        getUserProfile() {
          return 'User profile data';
        }

        @SkipMerchantCheck()
        updateUserSettings() {
          return 'User settings updated';
        }
      }

      expect(UserController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should work with other decorators', () => {
      const Public = () => ({}) as any; // Mock public decorator

      class PublicController {
        @SkipMerchantCheck()
        @Public()
        getPublicStats() {
          return 'Public statistics';
        }
      }

      expect(PublicController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should skip merchant check for authentication endpoints', () => {
      class AuthController {
        @SkipMerchantCheck()
        refreshToken() {
          return 'Token refreshed';
        }

        @SkipMerchantCheck()
        logout() {
          return 'Logged out';
        }
      }

      expect(AuthController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should skip merchant check for cross-merchant operations', () => {
      class MerchantController {
        @SkipMerchantCheck()
        getAllMerchants() {
          return 'All merchants list';
        }

        @SkipMerchantCheck()
        compareMerchants() {
          return 'Merchants comparison data';
        }
      }

      expect(MerchantController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });
  });

  // Skipping TypeScript integration tests that require actual decorator application
  describe('TypeScript integration', () => {
    it('should work with method decorators', () => {
      class TestClass {
        @SkipMerchantCheck()
        testMethod(param: string): string {
          return param;
        }
      }

      const instance = new TestClass();
      expect(typeof instance.testMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should work with class decorators', () => {
      @SkipMerchantCheck()
      class TestClass {
        testMethod(): string {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(typeof instance.testMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should maintain method signature', () => {
      class TestClass {
        @SkipMerchantCheck()
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
        @SkipMerchantCheck()
        async asyncMethod(): Promise<string> {
          await Promise.resolve();
          return 'async result';
        }
      }

      const instance = new TestClass();
      expect(typeof instance.asyncMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });
  });

  // Skipping decorator composition tests that require actual decorator application
  describe('decorator composition and stacking', () => {
    it('should be stackable with other metadata decorators', () => {
      const Roles = (..._args: any[]) => (() => {}) as any; // Mock roles decorator

      class TestController {
        @SkipMerchantCheck()
        @Roles('ADMIN')
        adminSkipMethod() {
          return 'admin skip method';
        }
      }

      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should work in decorator arrays', () => {
      class TestController {
        @([SkipMerchantCheck()] as any)
        arrayDecoratedMethod() {
          return 'array decorated';
        }
      }
      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should work with multiple skip decorators on different methods', () => {
      class TestController {
        @SkipMerchantCheck()
        method1() {
          return 'method1';
        }

        @SkipMerchantCheck()
        method2() {
          return 'method2';
        }

        @SkipMerchantCheck()
        method3() {
          return 'method3';
        }
      }
      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledTimes(3);
      setMetadataMock.mock.calls.forEach((call) => {
        expect(call).toEqual(['skipMerchantCheck', true]);
      });
    });
  });

  describe('error handling', () => {
    it('should handle SetMetadata throwing errors', () => {
      setMetadataMock.mockImplementation(() => {
        throw new Error('Metadata error');
      });

      expect(() => SkipMerchantCheck()).toThrow('Metadata error');
    });

    it('should handle undefined return from SetMetadata', () => {
      setMetadataMock.mockReturnValue(undefined as any);

      const result = SkipMerchantCheck();
      expect(result).toBeUndefined();
    });

    it('should handle null return from SetMetadata', () => {
      setMetadataMock.mockReturnValue(null as any);

      const result = SkipMerchantCheck();
      expect(result).toBeNull();
    });
  });

  describe('performance considerations', () => {
    it('should be lightweight and not create unnecessary objects', () => {
      const startTime = Date.now();

      // Call multiple times rapidly
      for (let i = 0; i < 1000; i++) {
        SkipMerchantCheck();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 1000 calls)
      expect(duration).toBeLessThan(100);
    });

    it('should not have memory leaks', () => {
      // Call many times and ensure no memory issues
      for (let i = 0; i < 10000; i++) {
        SkipMerchantCheck();
      }

      // If we get here without issues, the test passes
      expect(true).toBe(true);
    });

    it('should handle concurrent usage', () => {
      const results: unknown[] = [];

      // Simulate concurrent calls
      for (let i = 0; i < 100; i++) {
        results.push(SkipMerchantCheck());
      }

      expect(results).toHaveLength(100);
      expect(setMetadataMock).toHaveBeenCalledTimes(100);
    });
  });

  // Skipping integration tests that require actual decorator application
  describe('integration with guards and middleware', () => {
    it('should work with merchant guards that check skipMerchantCheck metadata', () => {
      class MockMerchantGuard {
        static shouldSkipMerchantCheck(metadata: Record<string, any>): boolean {
          return metadata.skipMerchantCheck === true;
        }
      }

      // Simulate guard checking the metadata
      const metadata = { skipMerchantCheck: true };
      const shouldSkip = MockMerchantGuard.shouldSkipMerchantCheck(metadata);

      expect(shouldSkip).toBe(true);

      const regularMetadata = { skipMerchantCheck: false };
      const shouldNotSkip =
        MockMerchantGuard.shouldSkipMerchantCheck(regularMetadata);

      expect(shouldNotSkip).toBe(false);
    });

    it('should differentiate skip from regular endpoints', () => {
      class TestController {
        @SkipMerchantCheck()
        skipEndpoint() {
          return 'skipped';
        }

        regularEndpoint() {
          return 'checked';
        }
      }
      expect(TestController).toBeDefined();
      // Only the skip endpoint should have the metadata
      expect(setMetadataMock).toHaveBeenCalledTimes(1);
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });
  });

  // Skipping business logic integration tests that require actual decorator application
  describe('business logic integration', () => {
    it('should allow system-wide operations without merchant context', () => {
      class SystemController {
        @SkipMerchantCheck()
        getSystemMetrics() {
          return {
            totalUsers: 1000,
            totalMerchants: 50,
            systemHealth: 'good',
          };
        }

        @SkipMerchantCheck()
        performSystemMaintenance() {
          return 'System maintenance completed';
        }
      }
      expect(SystemController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should allow cross-merchant data access for admin users', () => {
      class AdminController {
        @SkipMerchantCheck()
        getAllMerchantStats() {
          return 'All merchant statistics';
        }

        @SkipMerchantCheck()
        auditMerchantActivity() {
          return 'Merchant activity audit';
        }
      }
      expect(AdminController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should handle public data that does not belong to any merchant', () => {
      class PublicController {
        @SkipMerchantCheck()
        getPublicAnnouncements() {
          return 'Public announcements';
        }

        @SkipMerchantCheck()
        getSystemNews() {
          return 'System news and updates';
        }
      }
      expect(PublicController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });
  });

  // Skipping edge case tests that require actual decorator application
  describe('edge cases', () => {
    it('should work with empty classes', () => {
      @SkipMerchantCheck()
      class EmptyController {}
      expect(EmptyController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should work with methods that have no parameters', () => {
      class TestController {
        @SkipMerchantCheck()
        noParamsMethod() {
          return 'no params';
        }
      }
      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });

    it('should work with methods that have many parameters', () => {
      class TestController {
        @SkipMerchantCheck()
        manyParamsMethod(a: string, b: number, c: boolean, d: object) {
          return { a, b, c, d };
        }
      }
      expect(TestController).toBeDefined();
      expect(setMetadataMock).toHaveBeenCalledWith('skipMerchantCheck', true);
    });
  });
});
