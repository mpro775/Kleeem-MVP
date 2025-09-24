import { Test, type TestingModule } from '@nestjs/testing';

import { ProductSyncService } from '../product-sync.service';

const repo = {
  findByExternal: jest.fn(),
  upsertExternal: jest.fn(),
};
const indexer = { upsert: jest.fn() };
const storefronts = { findByMerchant: jest.fn() };
const categories = { findOne: jest.fn() };

describe('ProductSyncService', () => {
  let svc: ProductSyncService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSyncService,
        { provide: 'ProductsRepository', useValue: repo },
        { provide: 'ProductIndexService', useValue: indexer },
        { provide: 'StorefrontService', useValue: storefronts },
        { provide: 'CategoriesService', useValue: categories },
      ],
    }).compile();
    svc = module.get(ProductSyncService);
    jest.resetAllMocks();
  });

  it('upsertExternalProduct -> returns created flag when new product', async () => {
    const externalProduct = {
      externalId: 'ext1',
      title: 'Test Product',
      price: 99.99,
      stock: 10,
      raw: {
        description: 'Test description',
        images: [{ url: 'http://example.com/image.jpg' }],
      },
    };

    repo.findByExternal.mockResolvedValue(null);
    repo.upsertExternal.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      merchantId: '507f1f77bcf86cd799439012',
    });
    storefronts.findByMerchant.mockResolvedValue({
      slug: 'test-store',
      domain: 'test.com',
    });
    categories.findOne.mockResolvedValue({ name: 'Test Category' });

    const result = await svc.upsertExternalProduct(
      '507f1f77bcf86cd799439012',
      'zid',
      externalProduct as any,
    );

    expect(repo.findByExternal).toHaveBeenCalledWith(
      expect.any(Object), // ObjectId
      'ext1',
    );
    expect(repo.upsertExternal).toHaveBeenCalled();
    expect(storefronts.findByMerchant).toHaveBeenCalled();
    expect(categories.findOne).toHaveBeenCalled();
    expect(indexer.upsert).toHaveBeenCalled();
    expect(result).toEqual({
      created: true,
      id: '507f1f77bcf86cd799439011',
    });
  });

  it('upsertExternalProduct -> returns created false when updating existing', async () => {
    const existingProduct = {
      _id: '507f1f77bcf86cd799439011',
      merchantId: '507f1f77bcf86cd799439012',
    };
    const externalProduct = {
      externalId: 'ext1',
      title: 'Updated Product',
      price: 149.99,
      stock: 5,
      raw: {},
    };

    repo.findByExternal.mockResolvedValue(existingProduct);
    repo.upsertExternal.mockResolvedValue(existingProduct);
    storefronts.findByMerchant.mockResolvedValue({
      slug: 'test-store',
    });
    categories.findOne.mockResolvedValue(null);

    const result = await svc.upsertExternalProduct(
      '507f1f77bcf86cd799439012',
      'zid',
      externalProduct as any,
    );

    expect(repo.findByExternal).toHaveBeenCalled();
    expect(repo.upsertExternal).toHaveBeenCalled();
    expect(result).toEqual({
      created: false,
      id: '507f1f77bcf86cd799439011',
    });
  });

  it('upsertExternalProduct -> handles missing storefront', async () => {
    const externalProduct = {
      externalId: 'ext1',
      title: 'Test Product',
      raw: {},
    };

    repo.findByExternal.mockResolvedValue(null);
    repo.upsertExternal.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      merchantId: '507f1f77bcf86cd799439012',
    });
    storefronts.findByMerchant.mockResolvedValue(null);

    await svc.upsertExternalProduct(
      '507f1f77bcf86cd799439012',
      'zid',
      externalProduct as any,
    );

    expect(storefronts.findByMerchant).toHaveBeenCalled();
    expect(indexer.upsert).toHaveBeenCalledWith(
      expect.any(Object),
      null, // null storefront
      null, // null category
    );
  });

  it('upsertExternalProduct -> handles missing category', async () => {
    const externalProduct = {
      externalId: 'ext1',
      title: 'Test Product',
      raw: {},
    };

    repo.findByExternal.mockResolvedValue(null);
    repo.upsertExternal.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      merchantId: '507f1f77bcf86cd799439012',
      category: '507f1f77bcf86cd799439013',
    });
    storefronts.findByMerchant.mockResolvedValue({
      slug: 'test-store',
    });
    categories.findOne.mockResolvedValue(null);

    await svc.upsertExternalProduct(
      '507f1f77bcf86cd799439012',
      'zid',
      externalProduct as any,
    );

    expect(categories.findOne).toHaveBeenCalledWith(
      '507f1f77bcf86cd799439013',
      '507f1f77bcf86cd799439012',
    );
    expect(indexer.upsert).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      null, // null category name
    );
  });

  it('upsertExternalProduct -> handles different providers', async () => {
    const externalProduct = {
      externalId: 'ext1',
      title: 'Test Product',
      raw: {},
    };

    repo.findByExternal.mockResolvedValue(null);
    repo.upsertExternal.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      merchantId: '507f1f77bcf86cd799439012',
    });
    storefronts.findByMerchant.mockResolvedValue({
      slug: 'test-store',
    });

    // Test with salla provider
    await svc.upsertExternalProduct(
      '507f1f77bcf86cd799439012',
      'salla',
      externalProduct as any,
    );

    expect(repo.upsertExternal).toHaveBeenCalledWith(
      expect.objectContaining({
        platform: 'salla',
      }),
    );
  });

  it('upsertExternalProduct -> processes images correctly', async () => {
    const externalProduct = {
      externalId: 'ext1',
      title: 'Test Product',
      raw: {
        images: [
          { url: 'http://example.com/image1.jpg' },
          { url: 'http://example.com/image2.jpg' },
          { url: '' },
          { url: null },
        ],
      },
    };

    repo.findByExternal.mockResolvedValue(null);
    repo.upsertExternal.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      merchantId: '507f1f77bcf86cd799439012',
    });
    storefronts.findByMerchant.mockResolvedValue({
      slug: 'test-store',
    });

    await svc.upsertExternalProduct(
      '507f1f77bcf86cd799439012',
      'zid',
      externalProduct as any,
    );

    expect(repo.upsertExternal).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [
          'http://example.com/image1.jpg',
          'http://example.com/image2.jpg',
        ],
      }),
    );
  });

  it('upsertExternalProduct -> handles price conversion', async () => {
    const externalProduct = {
      externalId: 'ext1',
      title: 'Test Product',
      price: '99.99',
      raw: {},
    };

    repo.findByExternal.mockResolvedValue(null);
    repo.upsertExternal.mockResolvedValue({
      _id: '507f1f77bcf86cd799439011',
      merchantId: '507f1f77bcf86cd799439012',
    });
    storefronts.findByMerchant.mockResolvedValue({
      slug: 'test-store',
    });

    await svc.upsertExternalProduct(
      '507f1f77bcf86cd799439012',
      'zid',
      externalProduct as any,
    );

    expect(repo.upsertExternal).toHaveBeenCalledWith(
      expect.objectContaining({
        price: 99.99,
      }),
    );
  });
});
