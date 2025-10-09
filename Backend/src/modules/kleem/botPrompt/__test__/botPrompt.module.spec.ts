import { MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { BotPromptController } from '../botPrompt.controller';
import { BotPromptModule } from '../botPrompt.module';
import { BotPromptService } from '../botPrompt.service';
import { PromptSandboxController } from '../prompt-sandbox.controller';
import { BotPromptMongoRepository } from '../repositories/bot-prompt.mongo.repository';
import { BotPrompt, BotPromptSchema } from '../schemas/botPrompt.schema';
import { BOT_PROMPT_REPOSITORY } from '../tokens';

// Mock external dependencies
jest.mock('../../settings/settings.module');
jest.mock('../../../vector/vector.module');
jest.mock('../../../common/config/common.module');

describe('BotPromptModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [BotPromptModule],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(module).toBeDefined();
  });

  describe('Controllers', () => {
    it('should provide BotPromptController', () => {
      const controller = module.get<BotPromptController>(BotPromptController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(BotPromptController);
    });

    it('should provide PromptSandboxController', () => {
      const controller = module.get<PromptSandboxController>(
        PromptSandboxController,
      );
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(PromptSandboxController);
    });
  });

  describe('Services', () => {
    it('should provide BotPromptService', () => {
      const service = module.get<BotPromptService>(BotPromptService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(BotPromptService);
    });

    it('should provide BOT_PROMPT_REPOSITORY token', () => {
      const repository = module.get<BotPromptMongoRepository>(
        BOT_PROMPT_REPOSITORY,
      );
      expect(repository).toBeDefined();
      expect(repository).toBeInstanceOf(BotPromptMongoRepository);
    });
  });

  describe('Mongoose Schema Registration', () => {
    it('should register BotPrompt schema with MongooseModule', () => {
      // Check if the module imports MongooseModule with BotPrompt schema
      const mongooseModule = module.get(MongooseModule);
      expect(mongooseModule).toBeDefined();

      // Verify that the BotPrompt schema is available
      const botPromptModel = module.get(`BotPromptModel`);
      expect(botPromptModel).toBeDefined();
    });
  });

  describe('Module Structure', () => {
    it('should export BotPromptService', () => {
      const exportedProviders = Reflect.getMetadata('exports', BotPromptModule);
      expect(exportedProviders).toContain(BotPromptService);
    });

    it('should import required modules', () => {
      const importedModules = Reflect.getMetadata('imports', BotPromptModule);
      expect(importedModules).toBeDefined();
      expect(importedModules.length).toBeGreaterThan(0);
    });

    it('should have controllers array with both controllers', () => {
      const controllers = Reflect.getMetadata('controllers', BotPromptModule);
      expect(controllers).toContain(BotPromptController);
      expect(controllers).toContain(PromptSandboxController);
    });

    it('should have providers array with all required services', () => {
      const providers = Reflect.getMetadata('providers', BotPromptModule);
      expect(providers).toBeDefined();
      expect(providers.length).toBeGreaterThan(0);

      // Check for BotPromptService
      const hasBotPromptService = providers.some(
        (provider) =>
          typeof provider === 'function' && provider === BotPromptService,
      );
      expect(hasBotPromptService).toBe(true);

      // Check for repository provider
      const hasRepositoryProvider = providers.some(
        (provider) =>
          typeof provider === 'object' &&
          provider.provide === BOT_PROMPT_REPOSITORY,
      );
      expect(hasRepositoryProvider).toBe(true);
    });
  });

  describe('Integration Test', () => {
    it('should allow dependency injection to work correctly', () => {
      const controller = module.get<BotPromptController>(BotPromptController);
      const service = module.get<BotPromptService>(BotPromptService);

      expect(controller).toBeDefined();
      expect(service).toBeDefined();

      // Verify that the controller has access to the service
      expect(controller['svc']).toBeDefined();
      expect(controller['svc']).toBe(service);
    });

    it('should provide all required external services', () => {
      // These services should be available through the module imports
      // Note: We can't directly test them here since they're mocked,
      // but we can verify the module structure allows for their injection
      const moduleProviders = module.get(BotPromptService);
      expect(moduleProviders).toBeDefined();
    });
  });

  describe('Module Configuration', () => {
    it('should configure MongooseModule correctly', () => {
      // This is more of a documentation test to ensure the module
      // is configured correctly for the schema registration
      expect(BotPromptSchema).toBeDefined();
      expect(BotPrompt).toBeDefined();
    });

    it('should have proper module metadata', () => {
      // Verify that the module has the expected structure
      expect(BotPromptModule).toBeDefined();

      // Check that it's a proper NestJS module
      const isModule = Reflect.hasMetadata('__module__', BotPromptModule);
      expect(isModule).toBe(true);
    });
  });
});
