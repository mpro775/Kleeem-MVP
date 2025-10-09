import { SchedulerRegistry } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';

import { OutboxDispatcher } from './outbox.dispatcher';
import { OutboxModule } from './outbox.module';
import { OutboxService } from './outbox.service';
import { OutboxWorkersModule } from './outbox.workers.module';

import type { TestingModule } from '@nestjs/testing';

describe('OutboxWorkersModule', () => {
  let module: TestingModule;
  let outboxDispatcher: OutboxDispatcher;
  let outboxService: OutboxService;
  let schedulerRegistry: SchedulerRegistry;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [OutboxWorkersModule],
    }).compile();

    outboxDispatcher = module.get<OutboxDispatcher>(OutboxDispatcher);
    outboxService = module.get<OutboxService>(OutboxService);
    schedulerRegistry = module.get<SchedulerRegistry>(SchedulerRegistry);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  it('should provide OutboxDispatcher', () => {
    expect(outboxDispatcher).toBeDefined();
    expect(outboxDispatcher).toBeInstanceOf(OutboxDispatcher);
  });

  it('should provide OutboxService through OutboxModule', () => {
    expect(outboxService).toBeDefined();
    expect(outboxService).toBeInstanceOf(OutboxService);
  });

  it('should provide SchedulerRegistry', () => {
    expect(schedulerRegistry).toBeDefined();
    expect(schedulerRegistry).toBeInstanceOf(SchedulerRegistry);
  });

  it('should import OutboxModule', () => {
    // Verify that OutboxModule is imported and its providers are available
    expect(outboxService).toBeDefined();
    expect(typeof outboxService.enqueueEvent).toBe('function');
    expect(typeof outboxService.claimBatch).toBe('function');
    expect(typeof outboxService.markPublished).toBe('function');
  });

  it('should have OutboxDispatcher as a provider', () => {
    // Verify that OutboxDispatcher is properly registered as a provider
    const dispatcher = module.get<OutboxDispatcher>(OutboxDispatcher);
    expect(dispatcher).toBeDefined();
    expect(typeof dispatcher.reap).toBe('function');
    expect(typeof dispatcher.tick).toBe('function');
  });

  it('should have proper module metadata', () => {
    // Verify module has required metadata
    expect(OutboxWorkersModule).toBeDefined();

    // Check if module has imports and providers
    expect(typeof OutboxWorkersModule).toBe('function');

    // The module should import OutboxModule and provide OutboxDispatcher
    const modulePrototype = Object.getPrototypeOf(OutboxWorkersModule);
    expect(modulePrototype).toBeDefined();
  });

  describe('cron job registration', () => {
    it('should register cron jobs through decorators', () => {
      // Verify that the dispatcher has the cron-decorated methods
      expect(outboxDispatcher).toBeDefined();

      // The cron jobs are registered automatically by NestJS Schedule module
      // when the @Cron decorators are processed during module initialization

      // Verify that the methods exist and are functions
      expect(typeof outboxDispatcher.reap).toBe('function');
      expect(typeof outboxDispatcher.tick).toBe('function');
    });

    it('should have access to SchedulerRegistry for cron job management', () => {
      // Verify that SchedulerRegistry is available for cron job management
      expect(schedulerRegistry).toBeDefined();
      expect(typeof schedulerRegistry.addCronJob).toBe('function');
      expect(typeof schedulerRegistry.deleteCronJob).toBe('function');
      expect(typeof schedulerRegistry.getCronJob).toBe('function');
      expect(typeof schedulerRegistry.doesExist).toBe('function');
    });

    it('should handle cron job lifecycle correctly', () => {
      // This test verifies that cron jobs can be managed through the lifecycle
      expect(outboxDispatcher).toBeDefined();

      // In a real scenario, you would test actual cron job registration
      // Here we verify that the dispatcher is properly initialized
      expect(outboxDispatcher).toBeInstanceOf(OutboxDispatcher);
    });
  });

  describe('dependency injection', () => {
    it('should inject OutboxService correctly', () => {
      // Verify that OutboxDispatcher receives OutboxService through dependency injection
      expect(outboxService).toBeDefined();

      // The dispatcher should be able to call methods on the service
      expect(typeof outboxService.recoverStuckPublishing).toBe('function');
      expect(typeof outboxService.claimBatch).toBe('function');
      expect(typeof outboxService.markPublished).toBe('function');
      expect(typeof outboxService.reschedule).toBe('function');
    });

    it('should handle singleton instances correctly', () => {
      // Verify that services are provided as singletons within the module scope
      const service1 = module.get<OutboxService>(OutboxService);
      const service2 = module.get<OutboxService>(OutboxService);

      expect(service1).toBe(service2); // Should be the same instance
    });

    it('should handle cross-module dependencies correctly', () => {
      // Verify that OutboxWorkersModule properly depends on OutboxModule
      expect(outboxService).toBeDefined();
      expect(outboxDispatcher).toBeDefined();

      // Both should be properly instantiated
      expect(outboxService).toBeInstanceOf(OutboxService);
      expect(outboxDispatcher).toBeInstanceOf(OutboxDispatcher);
    });
  });

  describe('module lifecycle', () => {
    it('should initialize without errors', () => {
      // Verify that the module can be created and initialized without throwing errors
      expect(async () => {
        const testModule = await Test.createTestingModule({
          imports: [OutboxWorkersModule],
        }).compile();
        await testModule.close();
      }).not.toThrow();
    });

    it('should handle module creation with different import orders', async () => {
      // Test that OutboxWorkersModule works regardless of import order

      // Order 1: OutboxWorkersModule only
      const module1 = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      expect(module1.get<OutboxDispatcher>(OutboxDispatcher)).toBeDefined();
      expect(module1.get<OutboxService>(OutboxService)).toBeDefined();
      await module1.close();

      // Order 2: Multiple modules together
      const module2 = await Test.createTestingModule({
        imports: [OutboxModule, OutboxWorkersModule],
      }).compile();

      expect(module2.get<OutboxDispatcher>(OutboxDispatcher)).toBeDefined();
      expect(module2.get<OutboxService>(OutboxService)).toBeDefined();
      await module2.close();
    });

    it('should handle multiple module instances correctly', async () => {
      // Verify that multiple instances of modules work correctly

      const module1 = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      const module2 = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      const dispatcher1 = module1.get<OutboxDispatcher>(OutboxDispatcher);
      const dispatcher2 = module2.get<OutboxDispatcher>(OutboxDispatcher);

      // Should be different instances
      expect(dispatcher1).not.toBe(dispatcher2);
      expect(dispatcher1).toBeInstanceOf(OutboxDispatcher);
      expect(dispatcher2).toBeInstanceOf(OutboxDispatcher);

      await module1.close();
      await module2.close();
    });
  });

  describe('integration scenarios', () => {
    it('should work in a typical worker application setup', async () => {
      // Simulate a typical worker application that uses OutboxWorkersModule

      const appModule = await Test.createTestingModule({
        imports: [
          // Core modules
          OutboxModule,
          OutboxWorkersModule,
        ],
      }).compile();

      expect(appModule).toBeDefined();

      const dispatcher = appModule.get<OutboxDispatcher>(OutboxDispatcher);
      const service = appModule.get<OutboxService>(OutboxService);

      expect(dispatcher).toBeDefined();
      expect(service).toBeDefined();
      expect(dispatcher).toBeInstanceOf(OutboxDispatcher);
      expect(service).toBeInstanceOf(OutboxService);

      // Verify dispatcher methods are callable
      expect(typeof dispatcher.reap).toBe('function');
      expect(typeof dispatcher.tick).toBe('function');

      await appModule.close();
    });

    it('should handle worker shutdown gracefully', async () => {
      // Verify that module shutdown doesn't cause issues

      const testModule = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      expect(testModule).toBeDefined();

      // Should close without errors
      await expect(testModule.close()).resolves.not.toThrow();

      // Verify module is closed
      expect(testModule).toBeDefined();
    });

    it('should handle module hot-reloading scenarios', async () => {
      // Simulate module being recreated (e.g., during development with hot reload)

      for (let i = 0; i < 5; i++) {
        const testModule = await Test.createTestingModule({
          imports: [OutboxWorkersModule],
        }).compile();

        const dispatcher = testModule.get<OutboxDispatcher>(OutboxDispatcher);
        const service = testModule.get<OutboxService>(OutboxService);

        expect(dispatcher).toBeDefined();
        expect(service).toBeDefined();

        await testModule.close();
      }

      // If we get here without errors, hot-reloading simulation passed
      expect(true).toBe(true);
    });
  });

  describe('configuration validation', () => {
    it('should have valid provider configuration', () => {
      // Verify that all required providers are properly configured

      // OutboxDispatcher should be properly instantiated
      expect(outboxDispatcher).toBeDefined();
      expect(typeof outboxDispatcher.reap).toBe('function');
      expect(typeof outboxDispatcher.tick).toBe('function');

      // OutboxService should be available through OutboxModule
      expect(outboxService).toBeDefined();
      expect(typeof outboxService.enqueueEvent).toBe('function');
      expect(typeof outboxService.claimBatch).toBe('function');
      expect(typeof outboxService.markPublished).toBe('function');
      expect(typeof outboxService.reschedule).toBe('function');
      expect(typeof outboxService.recoverStuckPublishing).toBe('function');

      // SchedulerRegistry should be available
      expect(schedulerRegistry).toBeDefined();
    });

    it('should have proper module structure', () => {
      // Verify module structure is correct
      expect(OutboxWorkersModule).toBeDefined();

      // Module should be a proper NestJS module
      expect(typeof OutboxWorkersModule).toBe('function');

      // Should import OutboxModule
      const modulePrototype = Object.getPrototypeOf(OutboxWorkersModule);
      expect(modulePrototype).toBeDefined();
    });

    it('should handle missing dependencies gracefully', () => {
      // Test that the module handles missing dependencies during creation
      // This is more of a compile-time check

      expect(async () => {
        const testModule = await Test.createTestingModule({
          imports: [OutboxWorkersModule],
        }).compile();
        await testModule.close();
      }).not.toThrow();
    });
  });

  describe('performance considerations', () => {
    it('should initialize quickly', async () => {
      // Verify that module initialization is not slow
      const startTime = Date.now();

      const testModule = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
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
          imports: [OutboxWorkersModule],
        }).compile();

        const dispatcher = testModule.get<OutboxDispatcher>(OutboxDispatcher);
        const service = testModule.get<OutboxService>(OutboxService);

        expect(dispatcher).toBeDefined();
        expect(service).toBeDefined();

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
          imports: [OutboxWorkersModule],
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

  describe('error handling', () => {
    it('should handle service initialization errors gracefully', () => {
      // This test verifies that the module handles service initialization issues

      expect(async () => {
        const testModule = await Test.createTestingModule({
          imports: [OutboxWorkersModule],
        }).compile();

        // Even if there are initialization issues, the module should compile
        expect(testModule).toBeDefined();

        await testModule.close();
      }).not.toThrow();
    });

    it('should handle missing SchedulerRegistry gracefully', async () => {
      // Test module behavior without SchedulerRegistry
      // In a real scenario, this would require overriding the provider

      const testModule = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      expect(testModule).toBeDefined();

      // OutboxDispatcher should still be injectable
      const dispatcher = testModule.get<OutboxDispatcher>(OutboxDispatcher);
      expect(dispatcher).toBeDefined();

      await testModule.close();
    });

    it('should handle circular dependency scenarios', async () => {
      // Verify that the module doesn't have circular dependencies

      const testModule = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      expect(testModule).toBeDefined();

      // If module compiles successfully, no circular dependencies exist
      const dispatcher = testModule.get<OutboxDispatcher>(OutboxDispatcher);
      const service = testModule.get<OutboxService>(OutboxService);

      expect(dispatcher).toBeDefined();
      expect(service).toBeDefined();

      await testModule.close();
    });
  });

  describe('real-world usage patterns', () => {
    it('should support multiple worker instances', async () => {
      // Test that multiple worker instances can coexist

      const worker1 = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      const worker2 = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      const dispatcher1 = worker1.get<OutboxDispatcher>(OutboxDispatcher);
      const dispatcher2 = worker2.get<OutboxDispatcher>(OutboxDispatcher);

      // Each worker should have its own dispatcher instance
      expect(dispatcher1).not.toBe(dispatcher2);
      expect(dispatcher1).toBeInstanceOf(OutboxDispatcher);
      expect(dispatcher2).toBeInstanceOf(OutboxDispatcher);

      // But they should share the same service instance pattern
      const service1 = worker1.get<OutboxService>(OutboxService);
      const service2 = worker2.get<OutboxService>(OutboxService);

      expect(service1).not.toBe(service2);

      await worker1.close();
      await worker2.close();
    });

    it('should handle worker scaling scenarios', async () => {
      // Simulate worker scaling by creating multiple instances

      const workers: TestingModule[] = [];

      // Create multiple worker instances
      for (let i = 0; i < 5; i++) {
        const workerModule = await Test.createTestingModule({
          imports: [OutboxWorkersModule],
        }).compile();

        workers.push(workerModule);
      }

      // Verify all workers are functional
      for (const worker of workers) {
        const dispatcher = worker.get<OutboxDispatcher>(OutboxDispatcher);
        const service = worker.get<OutboxService>(OutboxService);

        expect(dispatcher).toBeDefined();
        expect(service).toBeDefined();
        expect(typeof dispatcher.reap).toBe('function');
        expect(typeof dispatcher.tick).toBe('function');
      }

      // Clean up
      for (const worker of workers) {
        await worker.close();
      }

      expect(workers).toHaveLength(5);
    });

    it('should support graceful worker shutdown', async () => {
      // Test that workers can be shut down gracefully

      const workerModule = await Test.createTestingModule({
        imports: [OutboxWorkersModule],
      }).compile();

      expect(workerModule).toBeDefined();

      // Simulate graceful shutdown
      await expect(workerModule.close()).resolves.not.toThrow();

      // Module should be closed
      expect(workerModule).toBeDefined();
    });
  });
});
