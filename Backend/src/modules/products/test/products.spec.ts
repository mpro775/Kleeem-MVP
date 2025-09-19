// src/modules/products/__tests__/products.service.spec.ts
import { Test } from '@nestjs/testing';
import { ProductsService } from '../products.service';

describe('ProductsService', () => {
  let svc: ProductsService;
  const repo = { create: jest.fn(), list: jest.fn() };
  const indexer = { upsert: jest.fn() };
  const media = { uploadMany: jest.fn() };
  const cache = { invalidate: jest.fn() };
  const storefronts = { getOrCreateForMerchant: jest.fn() };
  const categories = { getName: jest.fn() };

  beforeEach(async () => {
    const mod = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: 'ProductsRepository', useValue: repo },
        { provide: 'ProductIndexService', useValue: indexer },
        { provide: 'ProductMediaService', useValue: media },
        { provide: 'CacheService', useValue: cache },
        { provide: 'StorefrontService', useValue: storefronts },
        { provide: 'CategoryService', useValue: categories },
      ],
    }).compile();

    svc = mod.get(ProductsService);
  });

  it('creates product and indexes vector', async () => {
    storefronts.getOrCreateForMerchant.mockResolvedValue({
      slug: 's1',
      domain: 'd.com',
    });
    repo.create.mockResolvedValue({ _id: 'p1', merchantId: 'm1' });
    categories.getName.mockResolvedValue('عبايات');

    const res = await svc.create({ merchantId: 'm1', name: 'Prod' } as any);
    expect(repo.create).toHaveBeenCalled();
    expect(indexer.upsert).toHaveBeenCalled();
    expect(res._id).toBe('p1');
  });
});
