import { Test, type TestingModule } from '@nestjs/testing';

import { ProductPublicService } from '../product-public.service';

const repo = {
  listPublicByMerchant: jest.fn(),
  findPublicBySlugWithMerchant: jest.fn(),
};
const storefronts = { findBySlug: jest.fn() };

describe('ProductPublicService', () => {
  let svc: ProductPublicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductPublicService,
        { provide: 'ProductsRepository', useValue: repo },
        { provide: 'StorefrontService', useValue: storefronts },
      ],
    }).compile();
    svc = module.get(ProductPublicService);
    jest.resetAllMocks();
  });

  it('getPublicProducts -> returns empty if no storefront', async () => {
    storefronts.findBySlug.mockResolvedValue(null);

    const result = await svc.getPublicProducts('not-found', {
      limit: 10,
    } as any);

    expect(storefronts.findBySlug).toHaveBeenCalledWith('not-found');
    expect(repo.listPublicByMerchant).not.toHaveBeenCalled();
    expect(result).toEqual({
      items: [],
      meta: { hasMore: false, nextCursor: null, count: 0 },
    });
  });

  it('getPublicProducts -> returns products when storefront exists', async () => {
    const storefront = {
      merchantId: '507f1f77bcf86cd799439011',
      slug: 'test-store',
    };
    const productsResult = {
      items: [{ _id: 'p1', name: 'Product 1' }],
      meta: { hasMore: true, nextCursor: 'cursor123', count: 1 },
    };

    storefronts.findBySlug.mockResolvedValue(storefront);
    repo.listPublicByMerchant.mockResolvedValue(productsResult);

    const result = await svc.getPublicProducts('test-store', {
      limit: 10,
      cursor: 'prevCursor',
    } as any);

    expect(storefronts.findBySlug).toHaveBeenCalledWith('test-store');
    expect(repo.listPublicByMerchant).toHaveBeenCalledWith(
      expect.any(Object), // ObjectId
      { limit: 10, cursor: 'prevCursor' },
    );
    expect(result).toBe(productsResult);
  });

  it('getPublicProducts -> passes correct parameters to repository', async () => {
    const storefront = {
      merchantId: '507f1f77bcf86cd799439011',
    };
    const dto = {
      limit: 20,
      cursor: 'abc123',
      category: 'electronics',
      search: 'laptop',
    };

    storefronts.findBySlug.mockResolvedValue(storefront);
    repo.listPublicByMerchant.mockResolvedValue({
      items: [],
      meta: { hasMore: false, nextCursor: null, count: 0 },
    });

    await svc.getPublicProducts('store-slug', dto as any);

    expect(repo.listPublicByMerchant).toHaveBeenCalledWith(
      expect.any(Object),
      dto,
    );
  });

  it('getPublicBySlug -> returns null if no storefront', async () => {
    storefronts.findBySlug.mockResolvedValue(null);

    const result = await svc.getPublicBySlug('not-found', 'product-slug');

    expect(storefronts.findBySlug).toHaveBeenCalledWith('not-found');
    expect(repo.findPublicBySlugWithMerchant).not.toHaveBeenCalled();
    expect(result).toBe(null);
  });

  it('getPublicBySlug -> returns product when storefront exists', async () => {
    const storefront = {
      merchantId: '507f1f77bcf86cd799439011',
    };
    const product = {
      _id: '507f1f77bcf86cd799439012',
      name: 'Test Product',
      slug: 'product-slug',
    };

    storefronts.findBySlug.mockResolvedValue(storefront);
    repo.findPublicBySlugWithMerchant.mockResolvedValue(product);

    const result = await svc.getPublicBySlug('store-slug', 'product-slug');

    expect(storefronts.findBySlug).toHaveBeenCalledWith('store-slug');
    expect(repo.findPublicBySlugWithMerchant).toHaveBeenCalledWith(
      'product-slug',
      expect.any(Object), // ObjectId
    );
    expect(result).toBe(product);
  });

  it('getPublicBySlug -> returns null when product not found', async () => {
    const storefront = {
      merchantId: '507f1f77bcf86cd799439011',
    };

    storefronts.findBySlug.mockResolvedValue(storefront);
    repo.findPublicBySlugWithMerchant.mockResolvedValue(null);

    const result = await svc.getPublicBySlug('store-slug', 'non-existent');

    expect(result).toBe(null);
  });

  it('getPublicBySlug -> converts merchantId to ObjectId correctly', async () => {
    const storefront = {
      merchantId: '507f1f77bcf86cd799439011',
    };

    storefronts.findBySlug.mockResolvedValue(storefront);
    repo.findPublicBySlugWithMerchant.mockResolvedValue(null);

    await svc.getPublicBySlug('store', 'product');

    expect(repo.findPublicBySlugWithMerchant).toHaveBeenCalledWith(
      'product',
      expect.objectContaining({
        toString: expect.any(Function),
      }),
    );
  });

  it('getPublicProducts -> handles different storefront slugs', async () => {
    const storefront1 = { merchantId: '507f1f77bcf86cd799439011' };
    const storefront2 = { merchantId: '507f1f77bcf86cd799439012' };

    storefronts.findBySlug
      .mockResolvedValueOnce(storefront1)
      .mockResolvedValueOnce(storefront2);

    repo.listPublicByMerchant
      .mockResolvedValueOnce({
        items: [{ name: 'Product A' }],
        meta: { hasMore: false, nextCursor: null, count: 1 },
      })
      .mockResolvedValueOnce({
        items: [{ name: 'Product B' }],
        meta: { hasMore: false, nextCursor: null, count: 1 },
      });

    // Test first store
    const result1 = await svc.getPublicProducts('store-1', {} as any);
    expect(result1.items[0].name).toBe('Product A');

    // Test second store
    const result2 = await svc.getPublicProducts('store-2', {} as any);
    expect(result2.items[0].name).toBe('Product B');

    expect(storefronts.findBySlug).toHaveBeenCalledTimes(2);
    expect(repo.listPublicByMerchant).toHaveBeenCalledTimes(2);
  });
});
