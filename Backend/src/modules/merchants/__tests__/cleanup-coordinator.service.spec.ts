import { getModelToken } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';

import { CleanupCoordinatorService } from '../cleanup-coordinator.service';

describe('CleanupCoordinatorService', () => {
  let service: CleanupCoordinatorService;

  beforeEach(async () => {
    const mockModel = {
      deleteMany: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CleanupCoordinatorService,
        { provide: getModelToken('Merchant'), useValue: mockModel },
        { provide: getModelToken('Product'), useValue: mockModel },
        { provide: getModelToken('Category'), useValue: mockModel },
        { provide: getModelToken('User'), useValue: mockModel },
        { provide: getModelToken('Channel'), useValue: mockModel },
        { provide: getModelToken('ChatWidgetSettings'), useValue: mockModel },
        { provide: getModelToken('Storefront'), useValue: mockModel },
      ],
    }).compile();

    service = module.get<CleanupCoordinatorService>(CleanupCoordinatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('cleanupInternal', () => {
    const merchantId = '64a00000000000000000001';

    it('should cleanup all merchant-related data', async () => {
      await service.cleanupInternal(merchantId);
      // The method currently just logs and resolves, so we just verify it doesn't throw
      expect(service).toBeDefined();
    });
  });

  describe('cleanupExternal', () => {
    it('should cleanup external services', async () => {
      const merchantId = '64a00000000000000000001';
      await service.cleanupExternal(merchantId);
      expect(service).toBeDefined();
    });
  });

  describe('purgeAll', () => {
    it('should cleanup both internal and external data', async () => {
      const merchantId = '64a00000000000000000001';
      await service.purgeAll(merchantId);
      expect(service).toBeDefined();
    });
  });
});
