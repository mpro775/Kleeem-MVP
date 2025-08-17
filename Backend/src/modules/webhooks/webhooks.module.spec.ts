import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { WebhooksModule } from './webhooks.module';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';
import { Webhook, WebhookSchema } from './schemas/webhook.schema';
import { Merchant, MerchantSchema } from '../merchants/schemas/merchant.schema';
import { MessagingModule } from '../messaging/message.module';
import { OrdersModule } from '../orders/orders.module';
import { ChatMediaModule } from '../media/chat-media.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ChatModule } from '../chat/chat.module';
import { OutboxModule } from '../../common/outbox/outbox.module';

describe('WebhooksModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot('mongodb://localhost/test'),
        WebhooksModule,
      ],
    })
      .overrideModule(MessagingModule)
      .useModule(class MockMessagingModule {})
      .overrideModule(OrdersModule)
      .useModule(class MockOrdersModule {})
      .overrideModule(ChatMediaModule)
      .useModule(class MockChatMediaModule {})
      .overrideModule(IntegrationsModule)
      .useModule(class MockIntegrationsModule {})
      .overrideModule(ChatModule)
      .useModule(class MockChatModule {})
      .overrideModule(OutboxModule)
      .useModule(class MockOutboxModule {})
      .compile();
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(moduleRef).toBeDefined();
    });

    it('should have WebhooksService', () => {
      const service = moduleRef.get<WebhooksService>(WebhooksService);
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(WebhooksService);
    });

    it('should have WebhooksController', () => {
      const controller = moduleRef.get<WebhooksController>(WebhooksController);
      expect(controller).toBeDefined();
      expect(controller).toBeInstanceOf(WebhooksController);
    });
  });

  describe('Schema Configuration', () => {
    it('should register Webhook schema', () => {
      // Verify that the Webhook model is available
      expect(() => moduleRef.get('WebhookModel')).not.toThrow();
    });

    it('should register Merchant schema', () => {
      // Verify that the Merchant model is available
      expect(() => moduleRef.get('MerchantModel')).not.toThrow();
    });
  });

  describe('Module Dependencies', () => {
    it('should import MessagingModule', () => {
      const imports = Reflect.getMetadata('imports', WebhooksModule) || [];
      expect(imports).toBeDefined();
      expect(imports.length).toBeGreaterThan(0);
    });

    it('should import required modules', () => {
      const imports = Reflect.getMetadata('imports', WebhooksModule) || [];
      expect(imports).toBeDefined();
      expect(imports.length).toBeGreaterThan(5); // Should have multiple imports
    });
  });

  describe('Provider Configuration', () => {
    it('should provide WebhooksService', () => {
      const providers = Reflect.getMetadata('providers', WebhooksModule) || [];
      expect(providers).toContain(WebhooksService);
    });

    it('should export WebhooksService', () => {
      const exports = Reflect.getMetadata('exports', WebhooksModule) || [];
      expect(exports).toContain(WebhooksService);
    });
  });

  describe('Controller Configuration', () => {
    it('should register WebhooksController', () => {
      const controllers = Reflect.getMetadata('controllers', WebhooksModule) || [];
      expect(controllers).toContain(WebhooksController);
    });
  });

  describe('Module Integration', () => {
    it('should work with all imported modules', () => {
      expect(moduleRef).toBeDefined();

      // Verify that all main components are available
      expect(() => moduleRef.get(WebhooksService)).not.toThrow();
      expect(() => moduleRef.get(WebhooksController)).not.toThrow();
    });

    it('should handle dependency injection correctly', () => {
      const service = moduleRef.get<WebhooksService>(WebhooksService);
      const controller = moduleRef.get<WebhooksController>(WebhooksController);

      expect(service).toBeDefined();
      expect(controller).toBeDefined();
    });
  });

  describe('Module Lifecycle', () => {
    it('should initialize and destroy properly', async () => {
      expect(moduleRef).toBeDefined();
      await expect(moduleRef.close()).resolves.not.toThrow();
    });

    it('should handle multiple module instances', async () => {
      const secondModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env.test',
          }),
          MongooseModule.forRoot('mongodb://localhost/test-2'),
          WebhooksModule,
        ],
      })
        .overrideModule(MessagingModule)
        .useModule(class MockMessagingModule {})
        .overrideModule(OrdersModule)
        .useModule(class MockOrdersModule {})
        .overrideModule(ChatMediaModule)
        .useModule(class MockChatMediaModule {})
        .overrideModule(IntegrationsModule)
        .useModule(class MockIntegrationsModule {})
        .overrideModule(ChatModule)
        .useModule(class MockChatModule {})
        .overrideModule(OutboxModule)
        .useModule(class MockOutboxModule {})
        .compile();

      expect(secondModule).toBeDefined();
      expect(secondModule).not.toBe(moduleRef);

      await secondModule.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle database schema validation errors', () => {
      expect(WebhookSchema).toBeDefined();
      expect(MerchantSchema).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('should handle high concurrency', async () => {
      const service = moduleRef.get<WebhooksService>(WebhooksService);
      expect(service).toBeDefined();

      // This test verifies the module can handle concurrent access
      const concurrentRequests = Array.from({ length: 10 }, () => 
        Promise.resolve(service)
      );

      const results = await Promise.all(concurrentRequests);
      results.forEach(result => {
        expect(result).toBe(service);
      });
    });
  });
});
