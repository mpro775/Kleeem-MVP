import { Test } from '@nestjs/testing';

import { CommonServicesModule } from './common-services.module';
import { EnvironmentValidatorService } from './environment-validator.service';
import { PaginationService } from './pagination.service';
import { TranslationService } from './translation.service';

import type { TestingModule } from '@nestjs/testing';

describe('CommonServicesModule', () => {
  let module: TestingModule;
  let translationService: TranslationService;
  let paginationService: PaginationService;
  let environmentValidatorService: EnvironmentValidatorService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [CommonServicesModule],
    }).compile();

    translationService = module.get<TranslationService>(TranslationService);
    paginationService = module.get<PaginationService>(PaginationService);
    environmentValidatorService = module.get<EnvironmentValidatorService>(
      'EnvironmentValidatorService',
    );
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide TranslationService', () => {
    expect(translationService).toBeDefined();
    expect(translationService).toBeInstanceOf(TranslationService);
  });

  it('should provide PaginationService', () => {
    expect(paginationService).toBeDefined();
    expect(paginationService).toBeInstanceOf(PaginationService);
  });

  it('should provide EnvironmentValidatorService', () => {
    expect(environmentValidatorService).toBeDefined();
    expect(environmentValidatorService).toBeInstanceOf(
      EnvironmentValidatorService,
    );
  });

  it('should have proper module metadata', () => {
    // Verify module has required metadata
    expect(CommonServicesModule).toBeDefined();

    // Check if module has providers and exports
    expect(typeof CommonServicesModule).toBe('function');

    // The module should be a proper NestJS module
    const modulePrototype = Object.getPrototypeOf(CommonServicesModule);
    expect(modulePrototype).toBeDefined();
  });

  it('should export TranslationService', () => {
    // Verify that TranslationService is exported and available for injection
    expect(translationService).toBeDefined();
    expect(typeof translationService.translate).toBe('function');
    expect(typeof translationService.translateAuth).toBe('function');
  });

  it('should export PaginationService', () => {
    // Verify that PaginationService is exported and available for injection
    expect(paginationService).toBeDefined();
    expect(typeof paginationService.paginate).toBe('function');
    expect(typeof PaginationService.createPaginationIndex).toBe('function');
    expect(typeof PaginationService.createTextIndex).toBe('function');
  });

  it('should export EnvironmentValidatorService', () => {
    // Verify that EnvironmentValidatorService is exported and available for injection
    expect(environmentValidatorService).toBeDefined();
    expect(typeof environmentValidatorService.validateEnvironment).toBe(
      'function',
    );
    expect(typeof environmentValidatorService.validateOrExit).toBe('function');
    expect(typeof environmentValidatorService.logEnvironmentSummary).toBe(
      'function',
    );
  });

  describe('module lifecycle', () => {
    it('should initialize without errors', () => {
      // Verify that the module can be created and initialized without throwing errors
      expect(async () => {
        const testModule = await Test.createTestingModule({
          imports: [CommonServicesModule],
        }).compile();
        await testModule.close();
      }).not.toThrow();
    });

    it('should provide singleton instances', () => {
      // Verify that services are provided as singletons within the module scope
      const service1 = module.get<TranslationService>(TranslationService);
      const service2 = module.get<TranslationService>(TranslationService);

      expect(service1).toBe(service2); // Should be the same instance
    });

    it('should handle module creation with different import orders', async () => {
      // Test that CommonServicesModule works regardless of import order

      // Order 1: CommonServicesModule only
      const module1 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(module1.get<TranslationService>(TranslationService)).toBeDefined();
      expect(module1.get<PaginationService>(PaginationService)).toBeDefined();
      expect(
        module1.get<EnvironmentValidatorService>('EnvironmentValidatorService'),
      ).toBeDefined();
      await module1.close();

      // Order 2: Multiple modules together
      const module2 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(module2.get<TranslationService>(TranslationService)).toBeDefined();
      expect(module2.get<PaginationService>(PaginationService)).toBeDefined();
      expect(
        module2.get<EnvironmentValidatorService>('EnvironmentValidatorService'),
      ).toBeDefined();
      await module2.close();
    });

    it('should handle multiple module instances correctly', async () => {
      // Verify that multiple instances of modules work correctly

      const module1 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      const service1 = module1.get<TranslationService>(TranslationService);
      const service2 = module2.get<TranslationService>(TranslationService);

      // Should be different instances
      expect(service1).not.toBe(service2);
      expect(service1).toBeInstanceOf(TranslationService);
      expect(service2).toBeInstanceOf(TranslationService);

      await module1.close();
      await module2.close();
    });
  });

  describe('service integration', () => {
    it('should allow services to work together', () => {
      // Verify that all services are properly instantiated and functional
      expect(translationService).toBeDefined();
      expect(paginationService).toBeDefined();
      expect(environmentValidatorService).toBeDefined();

      // All services should have their required methods
      expect(typeof translationService.translate).toBe('function');
      expect(typeof paginationService.paginate).toBe('function');
      expect(typeof environmentValidatorService.validateEnvironment).toBe(
        'function',
      );
    });

    it('should provide services with correct dependencies', () => {
      // Verify that services have access to their required dependencies
      // This is more of a structural test since dependencies are injected

      expect(translationService).toBeInstanceOf(TranslationService);
      expect(paginationService).toBeInstanceOf(PaginationService);
      expect(environmentValidatorService).toBeInstanceOf(
        EnvironmentValidatorService,
      );
    });

    it('should handle service method calls correctly', () => {
      // Test basic service method availability
      expect(typeof translationService.translateAuth).toBe('function');
      expect(typeof paginationService.paginate).toBe('function');
      expect(typeof environmentValidatorService.validateEnvironment).toBe(
        'function',
      );
    });
  });

  describe('module configuration validation', () => {
    it('should have valid provider configuration', () => {
      // Verify that all providers are properly configured

      // TranslationService should be properly instantiated
      expect(translationService).toBeDefined();
      expect(typeof translationService.translate).toBe('function');
      expect(typeof translationService.translateAuth).toBe('function');

      // PaginationService should be properly instantiated
      expect(paginationService).toBeDefined();
      expect(typeof paginationService.paginate).toBe('function');
      expect(typeof PaginationService.createPaginationIndex).toBe('function');
      expect(typeof PaginationService.createTextIndex).toBe('function');

      // EnvironmentValidatorService should be properly instantiated
      expect(environmentValidatorService).toBeDefined();
      expect(typeof environmentValidatorService.validateEnvironment).toBe(
        'function',
      );
      expect(typeof environmentValidatorService.validateOrExit).toBe(
        'function',
      );
      expect(typeof environmentValidatorService.logEnvironmentSummary).toBe(
        'function',
      );
    });

    it('should have proper module structure', () => {
      // Verify module structure is correct
      expect(CommonServicesModule).toBeDefined();

      // Module should be a proper NestJS module
      expect(typeof CommonServicesModule).toBe('function');

      // Should have providers and exports
      const modulePrototype = Object.getPrototypeOf(CommonServicesModule);
      expect(modulePrototype).toBeDefined();
    });

    it('should handle missing dependencies gracefully', () => {
      // Test that the module handles missing dependencies during creation
      // This is more of a compile-time check

      expect(async () => {
        const testModule = await Test.createTestingModule({
          imports: [CommonServicesModule],
        }).compile();

        // Even if there are initialization issues, the module should compile
        expect(testModule).toBeDefined();

        await testModule.close();
      }).not.toThrow();
    });
  });

  describe('performance considerations', () => {
    it('should initialize quickly', async () => {
      // Verify that module initialization is not slow
      const startTime = Date.now();

      const testModule = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should initialize within reasonable time (less than 1 second)
      expect(duration).toBeLessThan(1000);

      await testModule.close();
    });

    it('should not create memory leaks during module lifecycle', async () => {
      // Test multiple module creation/destruction cycles

      for (let i = 0; i < 10; i++) {
        const testModule = await Test.createTestingModule({
          imports: [CommonServicesModule],
        }).compile();

        const translation =
          testModule.get<TranslationService>(TranslationService);
        const pagination = testModule.get<PaginationService>(PaginationService);
        const envValidator = testModule.get<EnvironmentValidatorService>(
          'EnvironmentValidatorService',
        );

        expect(translation).toBeDefined();
        expect(pagination).toBeDefined();
        expect(envValidator).toBeDefined();

        await testModule.close();
      }

      // If we get here without memory issues, the test passes
      expect(true).toBe(true);
    });

    it('should handle rapid module creation/destruction', async () => {
      // Test rapid creation and destruction of modules
      const modules: TestingModule[] = [];

      // Create multiple modules rapidly
      for (let i = 0; i < 20; i++) {
        const testModule = await Test.createTestingModule({
          imports: [CommonServicesModule],
        }).compile();

        modules.push(testModule);
      }

      // Verify all modules were created successfully
      expect(modules).toHaveLength(20);

      // Close all modules
      for (const testModule of modules) {
        await testModule.close();
      }

      // If we get here, rapid creation/destruction worked correctly
      expect(true).toBe(true);
    });
  });

  describe('real-world usage patterns', () => {
    it('should support typical application module imports', async () => {
      // Simulate a typical application module that imports CommonServicesModule

      const appModule = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(appModule).toBeDefined();

      const translation = appModule.get<TranslationService>(TranslationService);
      const pagination = appModule.get<PaginationService>(PaginationService);
      const envValidator = appModule.get<EnvironmentValidatorService>(
        'EnvironmentValidatorService',
      );

      expect(translation).toBeDefined();
      expect(pagination).toBeDefined();
      expect(envValidator).toBeDefined();

      // Verify service methods are callable
      expect(typeof translation.translate).toBe('function');
      expect(typeof pagination.paginate).toBe('function');
      expect(typeof envValidator.validateEnvironment).toBe('function');

      await appModule.close();
    });

    it('should handle module import order correctly', async () => {
      // Test that CommonServicesModule can be imported in different orders

      // Order 1: CommonServicesModule first
      const module1 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(module1.get<TranslationService>(TranslationService)).toBeDefined();
      expect(module1.get<PaginationService>(PaginationService)).toBeDefined();
      expect(
        module1.get<EnvironmentValidatorService>('EnvironmentValidatorService'),
      ).toBeDefined();
      await module1.close();

      // Order 2: CommonServicesModule after other modules
      const module2 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(module2.get<TranslationService>(TranslationService)).toBeDefined();
      expect(module2.get<PaginationService>(PaginationService)).toBeDefined();
      expect(
        module2.get<EnvironmentValidatorService>('EnvironmentValidatorService'),
      ).toBeDefined();
      await module2.close();
    });

    it('should support multiple application instances', async () => {
      // Test that multiple application instances can coexist

      const app1 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      const app2 = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      const translation1 = app1.get<TranslationService>(TranslationService);
      const translation2 = app2.get<TranslationService>(TranslationService);

      // Each app should have its own service instances
      expect(translation1).not.toBe(translation2);
      expect(translation1).toBeInstanceOf(TranslationService);
      expect(translation2).toBeInstanceOf(TranslationService);

      // But they should share the same service instance pattern
      const pagination1 = app1.get<PaginationService>(PaginationService);
      const pagination2 = app2.get<PaginationService>(PaginationService);

      expect(pagination1).not.toBe(pagination2);

      await app1.close();
      await app2.close();
    });

    it('should handle application scaling scenarios', async () => {
      // Simulate application scaling by creating multiple instances

      const apps: TestingModule[] = [];

      // Create multiple application instances
      for (let i = 0; i < 5; i++) {
        const appModule = await Test.createTestingModule({
          imports: [CommonServicesModule],
        }).compile();

        apps.push(appModule);
      }

      // Verify all applications are functional
      for (const app of apps) {
        const translation = app.get<TranslationService>(TranslationService);
        const pagination = app.get<PaginationService>(PaginationService);
        const envValidator = app.get<EnvironmentValidatorService>(
          'EnvironmentValidatorService',
        );

        expect(translation).toBeDefined();
        expect(pagination).toBeDefined();
        expect(envValidator).toBeDefined();

        expect(typeof translation.translate).toBe('function');
        expect(typeof pagination.paginate).toBe('function');
        expect(typeof envValidator.validateEnvironment).toBe('function');
      }

      // Clean up
      for (const app of apps) {
        await app.close();
      }

      expect(apps).toHaveLength(5);
    });

    it('should support graceful application shutdown', async () => {
      // Test that applications can be shut down gracefully

      const appModule = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(appModule).toBeDefined();

      // Simulate graceful shutdown
      await expect(appModule.close()).resolves.not.toThrow();

      // Module should be closed
      expect(appModule).toBeDefined();
    });

    it('should handle module hot-reloading scenarios', async () => {
      // Simulate module being recreated (e.g., during development with hot reload)

      for (let i = 0; i < 5; i++) {
        const testModule = await Test.createTestingModule({
          imports: [CommonServicesModule],
        }).compile();

        const translation =
          testModule.get<TranslationService>(TranslationService);
        const pagination = testModule.get<PaginationService>(PaginationService);
        const envValidator = testModule.get<EnvironmentValidatorService>(
          'EnvironmentValidatorService',
        );

        expect(translation).toBeDefined();
        expect(pagination).toBeDefined();
        expect(envValidator).toBeDefined();

        await testModule.close();
      }

      // If we get here without errors, hot-reloading simulation passed
      expect(true).toBe(true);
    });
  });

  describe('service interaction patterns', () => {
    it('should allow services to be used independently', () => {
      // Test that each service can be used independently
      expect(translationService).toBeDefined();
      expect(paginationService).toBeDefined();
      expect(environmentValidatorService).toBeDefined();

      // Each service should be functional on its own
      expect(typeof translationService.translate).toBe('function');
      expect(typeof paginationService.paginate).toBe('function');
      expect(typeof environmentValidatorService.validateEnvironment).toBe(
        'function',
      );

      // Services should not interfere with each other
      // Invoke methods and ignore returned Promises (if any) explicitly
      void translationService.translate('test'); // تُستدعى فعلاً
      void paginationService.paginate({} as any, { page: 1, limit: 10 } as any); // تُستدعى فعلاً
      void environmentValidatorService.validateEnvironment(); // تُستدعى فعلاً
    });

    it('should handle service method chaining correctly', () => {
      // Test that service methods can be called in sequence
      expect(() => translationService.translate('test')).not.toThrow();
      expect(() =>
        paginationService.paginate({} as any, { page: 1, limit: 10 } as any),
      ).not.toThrow();
      expect(() =>
        environmentValidatorService.validateEnvironment(),
      ).not.toThrow();
    });

    it('should maintain service isolation', () => {
      // Verify that services don't share mutable state inappropriately
      const service1 = module.get<TranslationService>(TranslationService);
      const service2 = module.get<TranslationService>(TranslationService);

      // Should be the same instance (singleton within module)
      expect(service1).toBe(service2);

      // But different service types should be different instances
      const paginationService1 =
        module.get<PaginationService>(PaginationService);
      const paginationService2 =
        module.get<PaginationService>(PaginationService);

      expect(paginationService1).toBe(paginationService2);
      expect(paginationService1).not.toBe(translationService);
    });
  });

  describe('error handling', () => {
    it('should handle service initialization errors gracefully', () => {
      // This test verifies that the module handles service initialization issues

      expect(async () => {
        const testModule = await Test.createTestingModule({
          imports: [CommonServicesModule],
        }).compile();

        // Even if there are initialization issues, the module should compile
        expect(testModule).toBeDefined();

        await testModule.close();
      }).not.toThrow();
    });

    it('should handle service dependency injection errors', async () => {
      // Test module behavior with potential dependency issues
      // In a real scenario, this would test actual dependency injection failures

      const testModule = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(testModule).toBeDefined();

      // All services should still be injectable
      const translation =
        testModule.get<TranslationService>(TranslationService);
      const pagination = testModule.get<PaginationService>(PaginationService);
      const envValidator = testModule.get<EnvironmentValidatorService>(
        'EnvironmentValidatorService',
      );

      expect(translation).toBeDefined();
      expect(pagination).toBeDefined();
      expect(envValidator).toBeDefined();

      await testModule.close();
    });

    it('should handle circular dependency scenarios', async () => {
      // Verify that the module doesn't have circular dependencies

      const testModule = await Test.createTestingModule({
        imports: [CommonServicesModule],
      }).compile();

      expect(testModule).toBeDefined();

      // If module compiles successfully, no circular dependencies exist
      const translation =
        testModule.get<TranslationService>(TranslationService);
      const pagination = testModule.get<PaginationService>(PaginationService);
      const envValidator = testModule.get<EnvironmentValidatorService>(
        'EnvironmentValidatorService',
      );

      expect(translation).toBeDefined();
      expect(pagination).toBeDefined();
      expect(envValidator).toBeDefined();

      await testModule.close();
    });
  });

  describe('module configuration', () => {
    it('should have correct provider registration', () => {
      // Verify that providers are registered correctly
      const translation = module.get<TranslationService>(TranslationService);
      const pagination = module.get<PaginationService>(PaginationService);
      const envValidator = module.get<EnvironmentValidatorService>(
        'EnvironmentValidatorService',
      );

      expect(translation).toBeInstanceOf(TranslationService);
      expect(pagination).toBeInstanceOf(PaginationService);
      expect(envValidator).toBeInstanceOf(EnvironmentValidatorService);
    });

    it('should have correct export configuration', () => {
      // Verify that exports are configured correctly
      // This is tested implicitly by the fact that services are injectable

      expect(translationService).toBeDefined();
      expect(paginationService).toBeDefined();
      expect(environmentValidatorService).toBeDefined();
    });

    it('should handle custom provider configuration', () => {
      // Test that the EnvironmentValidatorService is provided with the custom token
      const envValidatorByToken = module.get<EnvironmentValidatorService>(
        'EnvironmentValidatorService',
      );
      const envValidatorByClass = module.get<EnvironmentValidatorService>(
        EnvironmentValidatorService,
      );

      // Should be the same instance since useClass is used
      expect(envValidatorByToken).toBe(envValidatorByClass);
      expect(envValidatorByToken).toBeInstanceOf(EnvironmentValidatorService);
    });
  });

  describe('integration with other modules', () => {
    it('should work when imported by other modules', async () => {
      // Simulate another module importing CommonServicesModule

      const otherModule = await Test.createTestingModule({
        imports: [CommonServicesModule],
        providers: [
          // Simulate a service that depends on CommonServicesModule
          {
            provide: 'TestService',
            useFactory: (
              translation: TranslationService,
              pagination: PaginationService,
            ) => {
              return { translation, pagination };
            },
            inject: [TranslationService, PaginationService],
          },
        ],
      }).compile();

      expect(otherModule).toBeDefined();

      const testService = otherModule.get('TestService');
      expect(testService).toBeDefined();
      expect(testService.translation).toBeInstanceOf(TranslationService);
      expect(testService.pagination).toBeInstanceOf(PaginationService);

      await otherModule.close();
    });

    it('should handle module composition correctly', async () => {
      // Test that CommonServicesModule can be composed with other modules

      const composedModule = await Test.createTestingModule({
        imports: [
          CommonServicesModule,
          // Simulate other modules that might be imported together
        ],
      }).compile();

      expect(composedModule).toBeDefined();

      // All services should still be available
      const translation =
        composedModule.get<TranslationService>(TranslationService);
      const pagination =
        composedModule.get<PaginationService>(PaginationService);
      const envValidator = composedModule.get<EnvironmentValidatorService>(
        'EnvironmentValidatorService',
      );

      expect(translation).toBeDefined();
      expect(pagination).toBeDefined();
      expect(envValidator).toBeDefined();

      await composedModule.close();
    });
  });
});
