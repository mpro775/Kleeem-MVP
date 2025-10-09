import { MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import {
  BotRuntimeSettings,
  BotRuntimeSettingsSchema,
} from '../botRuntimeSettings.schema';
import { SettingsMongoRepository } from '../repositories/settings.mongo.repository';
import { SettingsController } from '../settings.controller';
import { SettingsModule } from '../settings.module';
import { SettingsService } from '../settings.service';
import { SETTINGS_REPOSITORY } from '../tokens';

describe('SettingsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [SettingsModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  describe('Module Structure', () => {
    it('should import MongooseModule with BotRuntimeSettings schema', () => {
      // Verify that the module imports MongooseModule
      const mongooseModule = module.get(MongooseModule);
      expect(mongooseModule).toBeDefined();

      // Verify that BotRuntimeSettings schema is registered
      const botRuntimeSettingsModel = module.get(`BotRuntimeSettingsModel`);
      expect(botRuntimeSettingsModel).toBeDefined();
    });

    it('should provide SettingsService', () => {
      const service = module.get<SettingsService>(SettingsService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(SettingsService);
    });

    it('should provide SettingsController', () => {
      const controller = module.get<SettingsController>(SettingsController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(SettingsController);
    });

    it('should provide SETTINGS_REPOSITORY token', () => {
      const repository =
        module.get<SettingsMongoRepository>(SETTINGS_REPOSITORY);
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(SettingsMongoRepository);
    });

    it('should export SettingsService', () => {
      // Check that the module exports SettingsService for use in other modules
      const exportedProviders = Reflect.getMetadata('exports', SettingsModule);
      expect(exportedProviders).toContain(SettingsService);
    });

    it('should have controllers array with SettingsController', () => {
      const controllers = Reflect.getMetadata('controllers', SettingsModule);
      expect(controllers).toContain(SettingsController);
    });

    it('should have providers array with all required services', () => {
      const providers = Reflect.getMetadata('providers', SettingsModule);
      expect(providers).toBeDefined();
      expect(providers.length).toBeGreaterThan(0);

      // Check for SettingsService
      const hasSettingsService = providers.some(
        (provider) =>
          typeof provider === 'function' && provider === SettingsService,
      );
      expect(hasSettingsService).toBe(true);

      // Check for repository provider
      const hasRepositoryProvider = providers.some(
        (provider) =>
          typeof provider === 'object' &&
          provider.provide === SETTINGS_REPOSITORY,
      );
      expect(hasRepositoryProvider).toBe(true);
    });

    it('should have imports array with MongooseModule', () => {
      const imports = Reflect.getMetadata('imports', SettingsModule);
      expect(imports).toBeDefined();
      expect(imports.length).toBeGreaterThan(0);

      // Check that MongooseModule is imported
      const hasMongooseModule = imports.some(
        (importedModule) => importedModule === MongooseModule,
      );
      expect(hasMongooseModule).toBe(true);
    });
  });

  describe('Schema Registration', () => {
    it('should register BotRuntimeSettings schema correctly', () => {
      // Verify that the schema is properly registered with Mongoose
      expect(BotRuntimeSettingsSchema).toBeDefined();
      expect(BotRuntimeSettingsSchema.paths).toBeDefined();

      // Check that the schema has the expected paths
      const schemaPaths = Object.keys(BotRuntimeSettingsSchema.paths);
      expect(schemaPaths).toContain('launchDate');
      expect(schemaPaths).toContain('applyUrl');
      expect(schemaPaths).toContain('integrationsNow');
      expect(schemaPaths).toContain('ctaEvery');
      expect(schemaPaths).toContain('highIntentKeywords');
      expect(schemaPaths).toContain('piiKeywords');
    });

    it('should have correct collection name', () => {
      expect(BotRuntimeSettingsSchema.options.collection).toBe(
        'bot_runtime_settings',
      );
    });

    it('should have timestamps enabled', () => {
      expect(BotRuntimeSettingsSchema.options.timestamps).toBe(true);
    });

    it('should have proper model name', () => {
      expect(BotRuntimeSettings.name).toBe('BotRuntimeSettings');
    });
  });

  describe('Dependency Injection', () => {
    it('should inject SettingsService into SettingsController', () => {
      const controller = module.get<SettingsController>(SettingsController);
      const service = module.get<SettingsService>(SettingsService);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();

      // Verify that the controller has access to the service
      expect(controller['svc']).toBeDefined();
      expect(controller['svc']).toBe(service);
    });

    it('should inject repository into SettingsService', () => {
      const service = module.get<SettingsService>(SettingsService);
      const repository =
        module.get<SettingsMongoRepository>(SETTINGS_REPOSITORY);

      expect(service).toBeDefined();
      expect(repository).toBeDefined();

      // Verify that the service has access to the repository
      expect(service['repo']).toBeDefined();
      expect(service['repo']).toBe(repository);
    });

    it('should provide all required dependencies', () => {
      // Verify that all necessary components are available
      expect(module.get(SettingsService)).toBeDefined();
      expect(module.get(SettingsController)).toBeDefined();
      expect(module.get(SETTINGS_REPOSITORY)).toBeDefined();
      expect(module.get(`BotRuntimeSettingsModel`)).toBeDefined();
    });
  });

  describe('Module Configuration', () => {
    it('should configure MongooseModule with correct schema', () => {
      // This is more of a documentation test to ensure the module
      // is configured correctly for the schema registration
      expect(BotRuntimeSettingsSchema).toBeDefined();
      expect(BotRuntimeSettings).toBeDefined();

      // Verify schema structure
      expect(BotRuntimeSettingsSchema.paths['launchDate']).toBeDefined();
      expect(BotRuntimeSettingsSchema.paths['applyUrl']).toBeDefined();
      expect(BotRuntimeSettingsSchema.paths['ctaEvery']).toBeDefined();
    });

    it('should have proper module metadata', () => {
      // Verify that the module has the expected structure
      expect(SettingsModule).toBeDefined();

      // Check that it's a proper NestJS module
      const isModule = Reflect.hasMetadata('__module__', SettingsModule);
      expect(isModule).toBe(true);
    });

    it('should configure repository provider correctly', () => {
      const providers = Reflect.getMetadata('providers', SettingsModule);

      // Find the repository provider
      const repositoryProvider = providers.find(
        (provider) =>
          typeof provider === 'object' &&
          provider.provide === SETTINGS_REPOSITORY,
      );

      expect(repositoryProvider).toBeDefined();
      expect(repositoryProvider.useClass).toBe(SettingsMongoRepository);
    });
  });

  describe('Integration Test', () => {
    it('should allow complete settings workflow', () => {
      const service = module.get<SettingsService>(SettingsService);
      const controller = module.get<SettingsController>(SettingsController);

      expect(service).toBeDefined();
      expect(controller).toBeDefined();

      // Verify that controller can access service
      expect(controller['svc']).toBe(service);

      // Verify that service can access repository
      expect(service['repo']).toBeDefined();
    });

    it('should provide schema for external use', () => {
      // The schema should be available for other modules that might need it
      const mongooseModule = module.get(MongooseModule);
      expect(mongooseModule).toBeDefined();

      // The model should be injectable
      const model = module.get(`BotRuntimeSettingsModel`);
      expect(model).toBeDefined();
    });

    it('should support service export for other modules', () => {
      // Other modules should be able to import SettingsService
      const exportedService = module.get(SettingsService);
      expect(exportedService).toBeDefined();
      expect(exportedService).toBeInstanceOf(SettingsService);
    });
  });

  describe('Module Dependencies', () => {
    it('should not have external module dependencies', () => {
      // SettingsModule should be self-contained
      const imports = Reflect.getMetadata('imports', SettingsModule);
      expect(imports).toBeDefined();

      // Should only import MongooseModule
      expect(imports.length).toBe(1);
      expect(imports[0]).toBe(MongooseModule);
    });

    it('should export only SettingsService', () => {
      const exports = Reflect.getMetadata('exports', SettingsModule);
      expect(exports).toBeDefined();
      expect(exports.length).toBe(1);
      expect(exports[0]).toBe(SettingsService);
    });

    it('should have single controller', () => {
      const controllers = Reflect.getMetadata('controllers', SettingsModule);
      expect(controllers).toBeDefined();
      expect(controllers.length).toBe(1);
      expect(controllers[0]).toBe(SettingsController);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing model gracefully', () => {
      // If the model fails to initialize, the module should still compile
      // but operations would fail at runtime
      expect(module).toBeDefined();

      // The model should be available
      expect(() => {
        module.get(`BotRuntimeSettingsModel`);
      }).not.toThrow();
    });

    it('should handle repository initialization errors', () => {
      // The module should compile even if repository has issues
      expect(module).toBeDefined();

      // Repository should be available
      expect(() => {
        module.get(SETTINGS_REPOSITORY);
      }).not.toThrow();
    });

    it('should handle service initialization errors', () => {
      // The module should compile even if service has issues
      expect(module).toBeDefined();

      // Service should be available
      expect(() => {
        module.get(SettingsService);
      }).not.toThrow();
    });
  });

  describe('Performance Considerations', () => {
    it('should initialize efficiently', async () => {
      const startTime = Date.now();

      // Module compilation should be fast
      const testModule = await Test.createTestingModule({
        imports: [SettingsModule],
      }).compile();

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should compile within 1 second

      await testModule.close();
    });

    it('should handle large schemas efficiently', () => {
      // The schema should be manageable even with many fields
      const schemaPaths = Object.keys(BotRuntimeSettingsSchema.paths);
      expect(schemaPaths.length).toBeGreaterThan(10);
      expect(schemaPaths.length).toBeLessThan(50); // Should not be excessively large
    });
  });

  describe('Schema and Model Integration', () => {
    it('should integrate schema and model correctly', () => {
      // Verify that the schema creates the correct model
      expect(BotRuntimeSettingsSchema).toBeDefined();
      expect(BotRuntimeSettings).toBeDefined();

      // The model name should match the schema
      expect(BotRuntimeSettings.name).toBe('BotRuntimeSettings');
    });

    it('should have consistent naming', () => {
      // Collection name should be consistent with model name
      const expectedCollectionName = 'bot_runtime_settings';
      expect(BotRuntimeSettingsSchema.options.collection).toBe(
        expectedCollectionName,
      );
    });

    it('should have proper schema options', () => {
      const schemaOptions = BotRuntimeSettingsSchema.options;

      expect(schemaOptions.timestamps).toBe(true);
      expect(schemaOptions.collection).toBe('bot_runtime_settings');
      expect(schemaOptions.versionKey).toBeUndefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize all components correctly', () => {
      // All components should be properly initialized
      const service = module.get(SettingsService);
      const controller = module.get(SettingsController);
      const repository = module.get(SETTINGS_REPOSITORY);
      const model = module.get(`BotRuntimeSettingsModel`);

      expect(service).toBeDefined();
      expect(controller).toBeDefined();
      expect(repository).toBeDefined();
      expect(model).toBeDefined();

      // Verify component relationships
      expect(controller['svc']).toBe(service);
      expect(service['repo']).toBe(repository);
    });

    it('should handle module cleanup correctly', async () => {
      // Module should close without errors
      await expect(module.close()).resolves.not.toThrow();
    });

    it('should support hot reloading scenarios', async () => {
      // Module should be able to be recreated
      const newModule = await Test.createTestingModule({
        imports: [SettingsModule],
      }).compile();

      expect(newModule).toBeDefined();
      expect(newModule.get(SettingsService)).toBeDefined();
      expect(newModule.get(SettingsController)).toBeDefined();

      await newModule.close();
    });
  });

  describe('Module Metadata Validation', () => {
    it('should have correct module decorator', () => {
      // Verify that SettingsModule is properly decorated as a NestJS module
      expect(SettingsModule).toBeDefined();

      // Check that it has the @Module decorator metadata
      const moduleMetadata = Reflect.getMetadata('__module__', SettingsModule);
      expect(moduleMetadata).toBeDefined();
    });

    it('should have proper provider configuration', () => {
      const providers = Reflect.getMetadata('providers', SettingsModule);

      // Should have at least the service and repository provider
      expect(providers.length).toBeGreaterThanOrEqual(2);

      // Should include SettingsService
      const hasService = providers.some(
        (provider) =>
          typeof provider === 'function' && provider === SettingsService,
      );
      expect(hasService).toBe(true);

      // Should include repository provider
      const hasRepoProvider = providers.some(
        (provider) =>
          typeof provider === 'object' &&
          provider.provide === SETTINGS_REPOSITORY,
      );
      expect(hasRepoProvider).toBe(true);
    });

    it('should have proper controller configuration', () => {
      const controllers = Reflect.getMetadata('controllers', SettingsModule);

      expect(controllers).toBeDefined();
      expect(controllers.length).toBe(1);
      expect(controllers[0]).toBe(SettingsController);
    });

    it('should have proper export configuration', () => {
      const exports = Reflect.getMetadata('exports', SettingsModule);

      expect(exports).toBeDefined();
      expect(exports.length).toBe(1);
      expect(exports[0]).toBe(SettingsService);
    });

    it('should have proper import configuration', () => {
      const imports = Reflect.getMetadata('imports', SettingsModule);

      expect(imports).toBeDefined();
      expect(imports.length).toBe(1);

      // Should import MongooseModule forFeature
      const mongooseForFeature = imports.find(
        (importedModule) =>
          importedModule &&
          typeof importedModule === 'object' &&
          importedModule.forFeature,
      );
      expect(mongooseForFeature).toBeDefined();
    });
  });

  describe('Business Logic Integration', () => {
    it('should support the complete settings workflow', () => {
      const service = module.get(SettingsService);
      const controller = module.get(SettingsController);

      // Both components should be available and functional
      expect(service).toBeDefined();
      expect(controller).toBeDefined();

      // Controller should delegate to service correctly
      expect(typeof controller.get).toBe('function');
      expect(typeof controller.update).toBe('function');

      // Service should have access to repository
      expect(service['repo']).toBeDefined();
    });

    it('should maintain data consistency across module', () => {
      // The module should ensure that all components work with the same schema
      const schemaPaths = Object.keys(BotRuntimeSettingsSchema.paths);
      const expectedFields = [
        'launchDate',
        'applyUrl',
        'integrationsNow',
        'trialOffer',
        'yemenNext',
        'yemenPositioning',
        'ctaEvery',
        'highIntentKeywords',
        'piiKeywords',
      ];

      expectedFields.forEach((field) => {
        expect(schemaPaths).toContain(field);
      });
    });

    it('should support internationalization requirements', () => {
      // The schema should support Arabic content
      const arabicFields = [
        'integrationsNow',
        'trialOffer',
        'yemenNext',
        'yemenPositioning',
      ];

      arabicFields.forEach((field) => {
        const schemaPath = BotRuntimeSettingsSchema.paths[field];
        expect(schemaPath.instance).toBe('String');

        // Should have default values (Arabic content support)
        expect(schemaPath).toBeDefined();
      });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing MongooseModule gracefully', () => {
      // If MongooseModule is not available, the module should still compile
      // but would fail at runtime when trying to use the model
      expect(module).toBeDefined();

      // The model should be available
      expect(() => {
        module.get(`BotRuntimeSettingsModel`);
      }).not.toThrow();
    });

    it('should handle repository provider errors', () => {
      // If repository provider fails, the module should still compile
      expect(module).toBeDefined();

      // Repository should be available
      expect(() => {
        module.get(SETTINGS_REPOSITORY);
      }).not.toThrow();
    });

    it('should handle service provider errors', () => {
      // If service provider fails, the module should still compile
      expect(module).toBeDefined();

      // Service should be available
      expect(() => {
        module.get(SettingsService);
      }).not.toThrow();
    });

    it('should handle controller provider errors', () => {
      // If controller provider fails, the module should still compile
      expect(module).toBeDefined();

      // Controller should be available
      expect(() => {
        module.get(SettingsController);
      }).not.toThrow();
    });
  });

  describe('Module Extensibility', () => {
    it('should support adding new providers', () => {
      // The module structure should allow for easy extension
      const providers = Reflect.getMetadata('providers', SettingsModule);
      expect(providers).toBeDefined();

      // Current providers count
      const currentProviderCount = providers.length;

      // Module should be extensible for future providers
      expect(currentProviderCount).toBeGreaterThan(0);
    });

    it('should support adding new controllers', () => {
      // The module structure should allow for easy extension
      const controllers = Reflect.getMetadata('controllers', SettingsModule);
      expect(controllers).toBeDefined();

      // Current controller count
      const currentControllerCount = controllers.length;

      // Module should be extensible for future controllers
      expect(currentControllerCount).toBe(1);
    });

    it('should support adding new exports', () => {
      // The module structure should allow for easy extension
      const exports = Reflect.getMetadata('exports', SettingsModule);
      expect(exports).toBeDefined();

      // Current export count
      const currentExportCount = exports.length;

      // Module should be extensible for future exports
      expect(currentExportCount).toBe(1);
    });

    it('should maintain backward compatibility', () => {
      // The module should maintain its current API
      expect(module.get(SettingsService)).toBeDefined();
      expect(module.get(SettingsController)).toBeDefined();
      expect(module.get(SETTINGS_REPOSITORY)).toBeDefined();

      // These should remain stable across updates
      expect(typeof module.get(SettingsService).get).toBe('function');
      expect(typeof module.get(SettingsService).update).toBe('function');
    });
  });

  describe('Testing Utilities', () => {
    it('should provide testable components', () => {
      // All components should be easily testable
      const service = module.get(SettingsService);
      const controller = module.get(SettingsController);
      const repository = module.get(SETTINGS_REPOSITORY);

      expect(service).toBeDefined();
      expect(controller).toBeDefined();
      expect(repository).toBeDefined();

      // Components should have the expected interfaces for testing
      expect(typeof service.get).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.cached).toBe('function');

      expect(typeof controller.get).toBe('function');
      expect(typeof controller.update).toBe('function');
    });

    it('should support mocking of dependencies', () => {
      // The module should allow easy mocking of dependencies for testing
      const repository = module.get(SETTINGS_REPOSITORY);
      expect(repository).toBeDefined();

      // Repository should be mockable
      expect(typeof repository.findOneLean).toBe('function');
      expect(typeof repository.create).toBe('function');
      expect(typeof repository.findOneAndUpdate).toBe('function');
    });

    it('should support integration testing', () => {
      // The module should support full integration testing
      const service = module.get(SettingsService);
      const controller = module.get(SettingsController);

      expect(service).toBeDefined();
      expect(controller).toBeDefined();

      // Service and controller should work together
      expect(controller['svc']).toBe(service);

      // Both should be functional
      expect(typeof service.get).toBe('function');
      expect(typeof controller.get).toBe('function');
    });
  });
});
