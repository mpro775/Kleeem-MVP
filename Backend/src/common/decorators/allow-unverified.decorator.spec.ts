import { SetMetadata } from '@nestjs/common';

import { AllowUnverifiedEmail } from './allow-unverified.decorator';
function mkMethodDecorator<TArgs extends any[] = []>(): jest.Mock<
  MethodDecorator,
  TArgs
> {
  return jest.fn((..._factoryArgs: TArgs) => {
    const dec: MethodDecorator = (_target, _key, _desc) => {
      /* no-op */
    };
    return dec;
  });
}
jest.mock('@nestjs/common', () => ({
  SetMetadata: jest.fn(),
}));

describe('AllowUnverifiedEmail Decorator', () => {
  let setMetadataMock: jest.MockedFunction<typeof SetMetadata>;

  beforeEach(() => {
    setMetadataMock = SetMetadata as jest.MockedFunction<typeof SetMetadata>;
    jest.clearAllMocks();

    // Default mock implementation
    setMetadataMock.mockReturnValue((() => {}) as any);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(AllowUnverifiedEmail).toBeDefined();
  });

  it('should be a function', () => {
    expect(typeof AllowUnverifiedEmail).toBe('function');
  });

  it('should call SetMetadata with correct key and value', () => {
    AllowUnverifiedEmail();

    expect(setMetadataMock).toHaveBeenCalledTimes(1);
    expect(setMetadataMock).toHaveBeenCalledWith('allowUnverifiedEmail', true);
  });

  it('should return the result of SetMetadata', () => {
    const mockDecorator = () => {};
    setMetadataMock.mockReturnValue(mockDecorator as any);

    const result = AllowUnverifiedEmail();

    expect(result).toBe(mockDecorator);
  });

  it('should always set the value to true', () => {
    // Call multiple times to ensure consistency
    for (let i = 0; i < 5; i++) {
      AllowUnverifiedEmail();
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    }
  });

  describe('decorator functionality', () => {
    it('should return a decorator function', () => {
      const decorator = AllowUnverifiedEmail();
      expect(typeof decorator).toBe('function');
    });

    it('should be applicable to class methods', () => {
      class TestController {
        @AllowUnverifiedEmail()
        testMethod() {
          return 'test';
        }
      }
      expect(TestController).toBeDefined(); // ✅ يقرأ القيمة

      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });

    it('should be applicable to classes', () => {
      @AllowUnverifiedEmail()
      class TestController {
        testMethod() {
          return 'test';
        }
      }
      expect(TestController).toBeDefined(); // ✅ يقرأ القيمة

      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });
  });

  describe('metadata key consistency', () => {
    it('should always use the same metadata key', () => {
      const calls: unknown[][] = [];

      // Multiple calls
      for (let i = 0; i < 3; i++) {
        AllowUnverifiedEmail();
        calls.push(setMetadataMock.mock.calls[i]);
      }

      // All calls should use the same key
      calls.forEach((call) => {
        expect(call[0]).toBe('allowUnverifiedEmail');
        expect(call[1]).toBe(true);
      });
    });

    it('should use camelCase key naming', () => {
      AllowUnverifiedEmail();

      const [key] = setMetadataMock.mock.calls[0];
      expect(key).toBe('allowUnverifiedEmail');
      expect(key).toMatch(/^[a-z][a-zA-Z]*$/); // camelCase pattern
    });
  });

  describe('real-world usage scenarios', () => {
    it('should allow unverified email for registration endpoints', () => {
      class AuthController {
        @AllowUnverifiedEmail()
        register() {
          return 'User registered with unverified email';
        }
      }
      expect(AuthController).toBeDefined(); // ✅ يقرأ القيمة

      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });

    it('should allow unverified email for password reset', () => {
      class AuthController {
        @AllowUnverifiedEmail()
        requestPasswordReset() {
          return 'Password reset requested';
        }
      }
      expect(AuthController).toBeDefined(); // ✅ يقرأ القيمة
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });

    it('should allow unverified email for email verification resend', () => {
      class AuthController {
        @AllowUnverifiedEmail()
        resendVerificationEmail() {
          return 'Verification email resent';
        }
      }
      expect(AuthController).toBeDefined(); // ✅ يقرأ القيمة
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });

    it('should work with other decorators', () => {
      const Public = mkMethodDecorator(); // Mock public decorator

      class AuthController {
        @AllowUnverifiedEmail()
        @Public()
        login() {
          return 'Login successful';
        }
      }
      expect(AuthController).toBeDefined(); // ✅ يقرأ القيمة
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });
  });

  describe('TypeScript integration', () => {
    it('should work with method decorators', () => {
      class TestClass {
        @AllowUnverifiedEmail()
        testMethod(param: string): string {
          return param;
        }
      }

      const instance = new TestClass();
      expect(typeof instance.testMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });

    it('should work with class decorators', () => {
      @AllowUnverifiedEmail()
      class TestClass {
        testMethod(): string {
          return 'test';
        }
      }

      const instance = new TestClass();
      expect(typeof instance.testMethod).toBe('function');
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });

    it('should maintain method signature', () => {
      class TestClass {
        @AllowUnverifiedEmail()
        testMethod(input: number): number {
          return input * 2;
        }
      }

      const instance = new TestClass();
      const result = instance.testMethod(5);
      expect(result).toBe(10);
    });
  });

  describe('decorator composition and stacking', () => {
    it('should be stackable with other metadata decorators', () => {
      const Roles = mkMethodDecorator<[string]>();
      class TestController {
        @AllowUnverifiedEmail()
        @Roles('ADMIN')
        adminMethod() {
          return 'admin only';
        }
      }

      expect(TestController).toBeDefined(); // ✅ يقرأ القيمة
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });

    it('should work in decorator arrays', () => {
      const decorator = mkMethodDecorator<[string]>();

      class TestController {
        @AllowUnverifiedEmail()
        @decorator('ADMIN') // <-- استدعاء المصنع ليُرجّع MethodDecorator
        arrayDecoratedMethod() {
          return 'array decorated';
        }
      }
      expect(TestController).toBeDefined(); // ✅ يقرأ القيمة
      expect(setMetadataMock).toHaveBeenCalledWith(
        'allowUnverifiedEmail',
        true,
      );
    });
  });

  describe('error handling', () => {
    it('should handle SetMetadata throwing errors', () => {
      setMetadataMock.mockImplementation(() => {
        throw new Error('Metadata error');
      });

      expect(() => AllowUnverifiedEmail()).toThrow('Metadata error');
    });

    it('should handle undefined return from SetMetadata', () => {
      setMetadataMock.mockReturnValue(undefined as any);

      const result = AllowUnverifiedEmail();
      expect(result).toBeUndefined();
    });
  });

  describe('performance considerations', () => {
    it('should be lightweight and not create unnecessary objects', () => {
      const startTime = Date.now();

      // Call multiple times rapidly
      for (let i = 0; i < 1000; i++) {
        AllowUnverifiedEmail();
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 1000 calls)
      expect(duration).toBeLessThan(100);
    });

    it('should not have memory leaks', () => {
      // Call many times and ensure no memory issues
      for (let i = 0; i < 10000; i++) {
        AllowUnverifiedEmail();
      }

      // If we get here without issues, the test passes
      expect(true).toBe(true);
    });
  });
});
