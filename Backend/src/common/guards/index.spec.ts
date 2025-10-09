import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

// Import all guards from the index file
import {
  AccountStateGuard,
  AuthGuard,
  IdentityGuard,
  JwtAuthGuard,
  MerchantStateGuard,
  RolesGuard,
  TrialGuard,
} from './index';

describe('Guards Index', () => {
  it('should export AccountStateGuard', () => {
    expect(AccountStateGuard).toBeDefined();
    expect(typeof AccountStateGuard).toBe('function');
  });

  it('should export AuthGuard', () => {
    expect(AuthGuard).toBeDefined();
    expect(typeof AuthGuard).toBe('function');
  });

  it('should export IdentityGuard', () => {
    expect(IdentityGuard).toBeDefined();
    expect(typeof IdentityGuard).toBe('function');
  });

  it('should export JwtAuthGuard', () => {
    expect(JwtAuthGuard).toBeDefined();
    expect(typeof JwtAuthGuard).toBe('function');
  });

  it('should export MerchantStateGuard', () => {
    expect(MerchantStateGuard).toBeDefined();
    expect(typeof MerchantStateGuard).toBe('function');
  });

  it('should export RolesGuard', () => {
    expect(RolesGuard).toBeDefined();
    expect(typeof RolesGuard).toBe('function');
  });

  it('should export TrialGuard', () => {
    expect(TrialGuard).toBeDefined();
    expect(typeof TrialGuard).toBe('function');
  });

  describe('Guard instantiation', () => {
    it('should be able to instantiate AccountStateGuard', () => {
      const guard = new AccountStateGuard(null as any);
      expect(guard).toBeInstanceOf(AccountStateGuard);
    });

    it('should be able to instantiate AuthGuard', () => {
      const guard = new AuthGuard(null as any, null as any);
      expect(guard).toBeInstanceOf(AuthGuard);
    });

    it('should be able to instantiate IdentityGuard', () => {
      const guard = new IdentityGuard(null as any, null as any, null as any);
      expect(guard).toBeInstanceOf(IdentityGuard);
    });

    it('should be able to instantiate JwtAuthGuard', () => {
      const guard = new JwtAuthGuard(null as any, null as any, null as any);
      expect(guard).toBeInstanceOf(JwtAuthGuard);
    });

    it('should be able to instantiate MerchantStateGuard', () => {
      const guard = new MerchantStateGuard(null as any);
      expect(guard).toBeInstanceOf(MerchantStateGuard);
    });

    it('should be able to instantiate RolesGuard', () => {
      const guard = new RolesGuard(null as any);
      expect(guard).toBeInstanceOf(RolesGuard);
    });

    it('should be able to instantiate TrialGuard', () => {
      const guard = new TrialGuard();
      expect(guard).toBeInstanceOf(TrialGuard);
    });
  });

  describe('Guard properties', () => {
    it('should have canActivate method on all guards', () => {
      const guards = [
        new AccountStateGuard(null as any),
        new AuthGuard(null as any, null as any),
        new IdentityGuard(null as any, null as any, null as any),
        new JwtAuthGuard(null as any, null as any, null as any),
        new MerchantStateGuard(null as any),
        new RolesGuard(null as any),
        new TrialGuard(),
      ];

      guards.forEach((guard) => {
        expect(typeof guard.canActivate).toBe('function');
      });
    });
  });

  describe('Export consistency', () => {
    it('should have consistent export names', () => {
      // Test that all exported guards have their expected names
      expect(AccountStateGuard.name).toBe('AccountStateGuard');
      expect(AuthGuard.name).toBe('AuthGuard');
      expect(IdentityGuard.name).toBe('IdentityGuard');
      expect(JwtAuthGuard.name).toBe('JwtAuthGuard');
      expect(MerchantStateGuard.name).toBe('MerchantStateGuard');
      expect(RolesGuard.name).toBe('RolesGuard');
      expect(TrialGuard.name).toBe('TrialGuard');
    });

    it('should export all guards that exist in the guards directory', () => {
      // This test verifies that the index exports all the guards that should be exported
      // The guards not exported in the index file are intentionally not exported
      // (like ServiceTokenGuard, WebhookSignatureGuard, etc. which might be for internal use)

      const exportedGuards = [
        AccountStateGuard,
        AuthGuard,
        IdentityGuard,
        JwtAuthGuard,
        MerchantStateGuard,
        RolesGuard,
        TrialGuard,
      ];

      expect(exportedGuards).toHaveLength(7);
      exportedGuards.forEach((guard) => {
        expect(guard).toBeDefined();
        expect(typeof guard).toBe('function');
      });
    });
  });

  describe('Import functionality', () => {
    it('should allow importing guards as a group', () => {
      // Test that we can import multiple guards at once
      const guards = {
        AccountStateGuard,
        AuthGuard,
        IdentityGuard,
        JwtAuthGuard,
        MerchantStateGuard,
        RolesGuard,
        TrialGuard,
      };

      Object.values(guards).forEach((guard) => {
        expect(guard).toBeDefined();
        expect(typeof guard).toBe('function');
      });
    });

    it('should allow importing individual guards', () => {
      // Test individual imports work correctly
      expect(AccountStateGuard).toBeDefined();
      expect(AuthGuard).toBeDefined();
      expect(IdentityGuard).toBeDefined();
      expect(JwtAuthGuard).toBeDefined();
      expect(MerchantStateGuard).toBeDefined();
      expect(RolesGuard).toBeDefined();
      expect(TrialGuard).toBeDefined();
    });
  });

  describe('Integration with NestJS', () => {
    it('should work with NestJS TestingModule', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AccountStateGuard,
          AuthGuard,
          IdentityGuard,
          JwtAuthGuard,
          MerchantStateGuard,
          RolesGuard,
          TrialGuard,
          {
            provide: Reflector,
            useValue: {
              getAllAndOverride: jest.fn(),
            },
          },
          {
            provide: JwtService,
            useValue: {
              verifyAsync: jest.fn(),
            },
          },
          {
            provide: CACHE_MANAGER,
            useValue: {
              get: jest.fn(),
            },
          },
          {
            provide: 'UserModel',
            useValue: {
              findById: jest.fn(),
            },
          },
          {
            provide: 'MerchantModel',
            useValue: {
              findById: jest.fn(),
            },
          },
        ],
      }).compile();

      expect(module.get(AccountStateGuard)).toBeInstanceOf(AccountStateGuard);
      expect(module.get(AuthGuard)).toBeInstanceOf(AuthGuard);
      expect(module.get(IdentityGuard)).toBeInstanceOf(IdentityGuard);
      expect(module.get(JwtAuthGuard)).toBeInstanceOf(JwtAuthGuard);
      expect(module.get(MerchantStateGuard)).toBeInstanceOf(MerchantStateGuard);
      expect(module.get(RolesGuard)).toBeInstanceOf(RolesGuard);
      expect(module.get(TrialGuard)).toBeInstanceOf(TrialGuard);
    });
  });

  describe('Guard interface compliance', () => {
    it('should implement CanActivate interface', () => {
      const mockReflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      };
      const mockJwtService = {
        verifyAsync: jest.fn(),
      };
      const mockCacheManager = {
        get: jest.fn(),
      };
      const mockUserModel = {
        findById: jest.fn(),
      };
      const mockMerchantModel = {
        findById: jest.fn(),
      };

      const guards = [
        new AccountStateGuard(mockReflector as any),
        new AuthGuard(mockJwtService as any, mockReflector as any),
        new IdentityGuard(
          mockUserModel as any,
          mockMerchantModel as any,
          mockReflector as any,
        ),
        new JwtAuthGuard(
          mockReflector as any,
          mockCacheManager as any,
          mockJwtService as any,
        ),
        new MerchantStateGuard(mockReflector as any),
        new RolesGuard(mockReflector as any),
        new TrialGuard(),
      ];

      guards.forEach((guard) => {
        expect(guard.canActivate).toBeDefined();
        expect(typeof guard.canActivate).toBe('function');
      });
    });
  });
});
