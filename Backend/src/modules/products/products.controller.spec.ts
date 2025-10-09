import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { JwtService } from '@nestjs/jwt';
import { Test, type TestingModule } from '@nestjs/testing';

import { TranslationService } from '../../common/services/translation.service';

import { ProductSetupConfigService } from './product-setup-config.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const mockProductsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockProductSetupConfigService = {
    getConfig: jest.fn(),
    setupProduct: jest.fn(),
  };

  const mockTranslationService = {
    translate: jest.fn(),
    getTranslations: jest.fn(),
  };

  beforeEach(async () => {
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      reset: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: mockProductsService },
        {
          provide: ProductSetupConfigService,
          useValue: mockProductSetupConfigService,
        },
        { provide: TranslationService, useValue: mockTranslationService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
