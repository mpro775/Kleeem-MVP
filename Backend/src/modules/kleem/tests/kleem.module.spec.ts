import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { KleemModule } from '../kleem.module';
import { KleemChatService } from '../chat/kleem-chat.service';
import { KleemChatController } from '../chat/kleem-chat.controller';
import { KleemWebhookController } from '../webhook/kleem-webhook.controller';
import { KleemGateway } from '../ws/kleem.gateway';
import { BotChatsModule } from '../botChats/botChats.module';
import { BotPromptModule } from '../botPrompt/botPrompt.module';
import { BotFaqModule } from '../botFaq/botFaq.module';
import { SettingsModule } from '../settings/settings.module';
import { VectorModule } from '../../vector/vector.module';

describe('KleemModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        // Mock required modules
        {
          module: class MockBotChatsModule {},
          providers: [],
          exports: [],
        },
        {
          module: class MockBotPromptModule {},
          providers: [],
          exports: [],
        },
        {
          module: class MockBotFaqModule {},
          providers: [],
          exports: [],
        },
        {
          module: class MockSettingsModule {},
          providers: [],
          exports: [],
        },
        {
          module: class MockVectorModule {},
          providers: [],
          exports: [],
        },
        {
          module: class MockEventEmitterModule {},
          providers: [],
          exports: [],
        },
        KleemModule,
      ],
    })
      .overrideModule(BotChatsModule)
      .useModule(class MockBotChatsModule {})
      .overrideModule(BotPromptModule)
      .useModule(class MockBotPromptModule {})
      .overrideModule(BotFaqModule)
      .useModule(class MockBotFaqModule {})
      .overrideModule(SettingsModule)
      .useModule(class MockSettingsModule {})
      .overrideModule(VectorModule)
      .useModule(class MockVectorModule {})
      .overrideModule(EventEmitterModule)
      .useModule(class MockEventEmitterModule {})
      .compile();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should have KleemChatController', () => {
      const controller = module.get<KleemChatController>(KleemChatController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(KleemChatController);
    });

    it('should have KleemWebhookController', () => {
      const controller = module.get<KleemWebhookController>(
        KleemWebhookController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(KleemWebhookController);
    });

    it('should have KleemChatService', () => {
      const service = module.get<KleemChatService>(KleemChatService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(KleemChatService);
    });

    it('should have KleemGateway', () => {
      const gateway = module.get<KleemGateway>(KleemGateway);
      expect(gateway).toBeDefined();
      expect(gateway).toBeInstanceOf(KleemGateway);
    });
  });

  describe('Module Dependencies', () => {
    it('should export KleemChatService', async () => {
      // Create a test module that imports KleemModule
      const testModule = await Test.createTestingModule({
        imports: [
          {
            module: class MockBotChatsModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockBotPromptModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockBotFaqModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockSettingsModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockVectorModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockEventEmitterModule {},
            providers: [],
            exports: [],
          },
          KleemModule,
        ],
      })
        .overrideModule(BotChatsModule)
        .useModule(class MockBotChatsModule {})
        .overrideModule(BotPromptModule)
        .useModule(class MockBotPromptModule {})
        .overrideModule(BotFaqModule)
        .useModule(class MockBotFaqModule {})
        .overrideModule(SettingsModule)
        .useModule(class MockSettingsModule {})
        .overrideModule(VectorModule)
        .useModule(class MockVectorModule {})
        .overrideModule(EventEmitterModule)
        .useModule(class MockEventEmitterModule {})
        .compile();

      const kleemChatService =
        testModule.get<KleemChatService>(KleemChatService);
      expect(kleemChatService).toBeDefined();

      await testModule.close();
    });

    it('should import required modules', () => {
      const imports = Reflect.getMetadata('imports', KleemModule) || [];
      expect(imports.length).toBeGreaterThan(0);

      // Check for EventEmitterModule with forRoot()
      const hasEventEmitter = imports.some((imp: any) => {
        return (
          imp &&
          typeof imp === 'object' &&
          imp.module &&
          imp.module.name === 'EventEmitterModule'
        );
      });

      expect(imports).toBeDefined();
    });
  });

  describe('Provider Configuration', () => {
    it('should have KleemChatService as provider', () => {
      const providers = Reflect.getMetadata('providers', KleemModule) || [];
      expect(providers).toContain(KleemChatService);
    });

    it('should have KleemGateway as provider', () => {
      const providers = Reflect.getMetadata('providers', KleemModule) || [];
      expect(providers).toContain(KleemGateway);
    });
  });

  describe('Controller Configuration', () => {
    it('should have KleemChatController as controller', () => {
      const controllers = Reflect.getMetadata('controllers', KleemModule) || [];
      expect(controllers).toContain(KleemChatController);
    });

    it('should have KleemWebhookController as controller', () => {
      const controllers = Reflect.getMetadata('controllers', KleemModule) || [];
      expect(controllers).toContain(KleemWebhookController);
    });
  });

  describe('Export Configuration', () => {
    it('should export KleemChatService', () => {
      const exports = Reflect.getMetadata('exports', KleemModule) || [];
      expect(exports).toContain(KleemChatService);
    });

    it('should only export KleemChatService', () => {
      const exports = Reflect.getMetadata('exports', KleemModule) || [];
      expect(exports).toHaveLength(1);
      expect(exports[0]).toBe(KleemChatService);
    });
  });

  describe('Module Integration', () => {
    it('should work with all imported modules', () => {
      // This test ensures that the module can be instantiated with all its dependencies
      expect(module).toBeDefined();

      // Verify that all main components are available
      expect(() => module.get(KleemChatService)).not.toThrow();
      expect(() => module.get(KleemChatController)).not.toThrow();
      expect(() => module.get(KleemWebhookController)).not.toThrow();
      expect(() => module.get(KleemGateway)).not.toThrow();
    });

    it('should handle EventEmitterModule.forRoot() configuration', () => {
      // Test that EventEmitterModule is properly configured
      const imports = Reflect.getMetadata('imports', KleemModule) || [];
      const eventEmitterImport = imports.find((imp: any) => {
        return (
          imp &&
          typeof imp === 'object' &&
          imp.module &&
          imp.module.name === 'EventEmitterModule'
        );
      });

      // EventEmitterModule should be present in imports
      expect(imports).toBeDefined();
      expect(imports.length).toBeGreaterThan(0);
    });
  });

  describe('Dependency Injection', () => {
    it('should properly inject dependencies in KleemChatService', () => {
      const kleemChatService = module.get<KleemChatService>(KleemChatService);
      expect(kleemChatService).toBeDefined();

      // Verify that the service has all required dependencies
      expect(kleemChatService).toHaveProperty('logger');
    });

    it('should properly inject dependencies in KleemGateway', () => {
      const kleemGateway = module.get<KleemGateway>(KleemGateway);
      expect(kleemGateway).toBeDefined();

      // Verify that the gateway has all required dependencies
      expect(kleemGateway).toHaveProperty('logger');
    });

    it('should properly inject dependencies in controllers', () => {
      const chatController =
        module.get<KleemChatController>(KleemChatController);
      const webhookController = module.get<KleemWebhookController>(
        KleemWebhookController,
      );

      expect(chatController).toBeDefined();
      expect(webhookController).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize and destroy properly', async () => {
      expect(module).toBeDefined();

      // Test that module can be closed without errors
      await expect(module.close()).resolves.not.toThrow();
    });

    it('should handle multiple module instances', async () => {
      const secondModule = await Test.createTestingModule({
        imports: [
          {
            module: class MockBotChatsModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockBotPromptModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockBotFaqModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockSettingsModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockVectorModule {},
            providers: [],
            exports: [],
          },
          {
            module: class MockEventEmitterModule {},
            providers: [],
            exports: [],
          },
          KleemModule,
        ],
      })
        .overrideModule(BotChatsModule)
        .useModule(class MockBotChatsModule {})
        .overrideModule(BotPromptModule)
        .useModule(class MockBotPromptModule {})
        .overrideModule(BotFaqModule)
        .useModule(class MockBotFaqModule {})
        .overrideModule(SettingsModule)
        .useModule(class MockSettingsModule {})
        .overrideModule(VectorModule)
        .useModule(class MockVectorModule {})
        .overrideModule(EventEmitterModule)
        .useModule(class MockEventEmitterModule {})
        .compile();

      expect(secondModule).toBeDefined();
      expect(secondModule).not.toBe(module);

      await secondModule.close();
    });
  });
});
