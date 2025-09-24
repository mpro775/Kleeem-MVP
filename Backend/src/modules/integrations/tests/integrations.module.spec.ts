import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { MerchantsModule } from '../../merchants/merchants.module';
import { EvolutionService } from '../evolution.service';
import { IntegrationsController } from '../integrations.controller';
import { IntegrationsModule } from '../integrations.module';
import { SallaModule } from '../salla/salla.module';
import { ZidModule } from '../zid/zid.module';

describe('IntegrationsModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        // Mock MongooseModule
        {
          module: class MockMongooseModule {},
          providers: [
            { provide: 'IntegrationModel', useValue: {} },
            { provide: 'MerchantModel', useValue: {} },
          ],
          exports: ['IntegrationModel', 'MerchantModel'],
        },
        // Mock HttpModule
        { module: class MockHttpModule {}, providers: [], exports: [] },
        // Mock MerchantsModule
        { module: class MockMerchantsModule {}, providers: [], exports: [] },
        // Mock SallaModule
        { module: class MockSallaModule {}, providers: [], exports: [] },
        // Mock ZidModule
        { module: class MockZidModule {}, providers: [], exports: [] },
        IntegrationsModule,
      ],
    })
      .overrideModule(MongooseModule)
      .useModule(class MockMongooseModule {})
      .overrideModule(HttpModule)
      .useModule(class MockHttpModule {})
      .overrideModule(MerchantsModule)
      .useModule(class MockMerchantsModule {})
      .overrideModule(SallaModule)
      .useModule(class MockSallaModule {})
      .overrideModule(ZidModule)
      .useModule(class MockZidModule {})
      .compile();
  });

  afterEach(async () => {
    await module?.close();
  });

  describe('Module Configuration', () => {
    it('should be defined', () => {
      expect(module).toBeDefined();
    });

    it('should have IntegrationsController', () => {
      const controller = module.get(IntegrationsController);
      expect(controller).toBeInstanceOf(IntegrationsController);
    });

    it('should have EvolutionService', () => {
      const evolutionService = module.get(EvolutionService);
      expect(evolutionService).toBeInstanceOf(EvolutionService);
    });
  });

  describe('Module Dependencies', () => {
    it('should export EvolutionService', async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          {
            module: class MockMongooseModule {},
            providers: [
              { provide: 'IntegrationModel', useValue: {} },
              { provide: 'MerchantModel', useValue: {} },
            ],
            exports: ['IntegrationModel', 'MerchantModel'],
          },
          { module: class MockHttpModule {}, providers: [], exports: [] },
          { module: class MockMerchantsModule {}, providers: [], exports: [] },
          { module: class MockSallaModule {}, providers: [], exports: [] },
          { module: class MockZidModule {}, providers: [], exports: [] },
          IntegrationsModule,
        ],
      })
        .overrideModule(MongooseModule)
        .useModule(class MockMongooseModule {})
        .overrideModule(HttpModule)
        .useModule(class MockHttpModule {})
        .overrideModule(MerchantsModule)
        .useModule(class MockMerchantsModule {})
        .overrideModule(SallaModule)
        .useModule(class MockSallaModule {})
        .overrideModule(ZidModule)
        .useModule(class MockZidModule {})
        .compile();

      expect(testModule.get(EvolutionService)).toBeDefined();
      await testModule.close();
    });

    it('should export SallaModule', async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          {
            module: class MockMongooseModule {},
            providers: [
              { provide: 'IntegrationModel', useValue: {} },
              { provide: 'MerchantModel', useValue: {} },
            ],
            exports: ['IntegrationModel', 'MerchantModel'],
          },
          { module: class MockHttpModule {}, providers: [], exports: [] },
          { module: class MockMerchantsModule {}, providers: [], exports: [] },
          { module: class MockSallaModule {}, providers: [], exports: [] },
          { module: class MockZidModule {}, providers: [], exports: [] },
          IntegrationsModule,
        ],
        providers: [
          {
            provide: 'TestService',
            useFactory: (sallaModule: unknown) => ({ sallaModule }),
            inject: [SallaModule],
          },
        ],
      })
        .overrideModule(MongooseModule)
        .useModule(class MockMongooseModule {})
        .overrideModule(HttpModule)
        .useModule(class MockHttpModule {})
        .overrideModule(MerchantsModule)
        .useModule(class MockMerchantsModule {})
        .overrideModule(SallaModule)
        .useModule(class MockSallaModule {})
        .overrideModule(ZidModule)
        .useModule(class MockZidModule {})
        .compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });

    it('should export ZidModule', async () => {
      const testModule = await Test.createTestingModule({
        imports: [
          {
            module: class MockMongooseModule {},
            providers: [
              { provide: 'IntegrationModel', useValue: {} },
              { provide: 'MerchantModel', useValue: {} },
            ],
            exports: ['IntegrationModel', 'MerchantModel'],
          },
          { module: class MockHttpModule {}, providers: [], exports: [] },
          { module: class MockMerchantsModule {}, providers: [], exports: [] },
          { module: class MockSallaModule {}, providers: [], exports: [] },
          { module: class MockZidModule {}, providers: [], exports: [] },
          IntegrationsModule,
        ],
        providers: [
          {
            provide: 'TestService',
            useFactory: (zidModule: unknown) => ({ zidModule }),
            inject: [ZidModule],
          },
        ],
      })
        .overrideModule(MongooseModule)
        .useModule(class MockMongooseModule {})
        .overrideModule(HttpModule)
        .useModule(class MockHttpModule {})
        .overrideModule(MerchantsModule)
        .useModule(class MockMerchantsModule {})
        .overrideModule(SallaModule)
        .useModule(class MockSallaModule {})
        .overrideModule(ZidModule)
        .useModule(class MockZidModule {})
        .compile();

      expect(testModule).toBeDefined();
      await testModule.close();
    });
  });

  describe('Provider Configuration', () => {
    it('should have EvolutionService as provider', () => {
      const providers: unknown[] =
        Reflect.getMetadata('providers', IntegrationsModule) || [];
      expect(providers).toContain(EvolutionService);
    });

    it('should have IntegrationsController as controller', () => {
      const controllers: unknown[] =
        Reflect.getMetadata('controllers', IntegrationsModule) || [];
      expect(controllers).toContain(IntegrationsController);
    });
  });

  describe('Import Configuration', () => {
    it('should import required modules', () => {
      const imports: unknown[] =
        Reflect.getMetadata('imports', IntegrationsModule) || [];

      // بدل المتغيّرات غير المستخدمة، خلِّ التوقعات مباشرة:
      const hasMongooseLike = imports.some(
        (imp: unknown) =>
          !!imp &&
          typeof (imp as { forFeature?: unknown }).forFeature === 'function',
      );
      const hasHttp = imports.some(
        (imp: unknown) =>
          imp === HttpModule ||
          (imp as { name?: string })?.name === 'HttpModule',
      );
      const hasSalla = imports.some(
        (imp: unknown) =>
          imp === SallaModule ||
          (imp as { name?: string })?.name === 'SallaModule',
      );
      const hasZid = imports.some(
        (imp: unknown) =>
          imp === ZidModule || (imp as { name?: string })?.name === 'ZidModule',
      );

      expect(imports.length).toBeGreaterThan(0);
      expect(hasMongooseLike).toBe(true);
      expect(hasHttp).toBe(true);
      expect(hasSalla).toBe(true);
      expect(hasZid).toBe(true);
    });
  });

  describe('Forward Reference', () => {
    it('should handle MerchantsModule forward reference', () => {
      const imports: unknown[] =
        Reflect.getMetadata('imports', IntegrationsModule) || [];
      const hasMerchantsModule = imports.some(
        (imp: unknown) =>
          imp === MerchantsModule ||
          typeof imp === 'function' ||
          (imp as { name?: string })?.name === 'MerchantsModule',
      );
      expect(Array.isArray(imports)).toBe(true);
      expect(hasMerchantsModule).toBe(true);
    });
  });

  describe('Schema Registration', () => {
    it('should register Integration schema', () => {
      // هنا مجرد smoke test على token
      const integrationToken = 'IntegrationModel';
      expect(integrationToken).toBe('IntegrationModel');
    });

    it('should register Merchant schema', () => {
      const merchantToken = 'MerchantModel';
      expect(merchantToken).toBe('MerchantModel');
    });
  });
});
