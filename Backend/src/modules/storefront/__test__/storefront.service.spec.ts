import { Test, type TestingModule } from '@nestjs/testing';

import { LeadsService } from '../../leads/leads.service';
import { VectorService } from '../../vector/vector.service';
import { type StorefrontCategoryRepository } from '../repositories/category.repository';
import { type StorefrontMerchantRepository } from '../repositories/merchant.repository';
import { type StorefrontOrderRepository } from '../repositories/order.repository';
import { type StorefrontProductRepository } from '../repositories/product.repository';
import { type StorefrontRepository } from '../repositories/storefront.repository';
import { StorefrontService } from '../storefront.service';
import {
  STOREFRONT_CATEGORY_REPOSITORY,
  STOREFRONT_MERCHANT_REPOSITORY,
  STOREFRONT_ORDER_REPOSITORY,
  STOREFRONT_PRODUCT_REPOSITORY,
  STOREFRONT_REPOSITORY,
} from '../tokens';

describe('StorefrontService', () => {
  let service: StorefrontService;

  const sfRepo: jest.Mocked<StorefrontRepository> = {
    create: jest.fn(),
    findByIdOrSlugLean: jest.fn(),
    findByMerchant: jest.fn(),
    existsSlug: jest.fn(),
    updateById: jest.fn(),
    deleteByMerchant: jest.fn(),
  };

  const prodRepo: jest.Mocked<StorefrontProductRepository> = {
    findActiveAvailableByMerchant: jest.fn(),
    updateManyByMerchantSet: jest.fn(),
    listIdsByMerchant: jest.fn(),
    resaveById: jest.fn(),
  };

  const merRepo: jest.Mocked<StorefrontMerchantRepository> = {
    findByIdLean: jest.fn(),
  };

  const catRepo: jest.Mocked<StorefrontCategoryRepository> = {
    listByMerchant: jest.fn(),
  };

  const orderRepo: jest.Mocked<StorefrontOrderRepository> = {
    findMyOrders: jest.fn(),
  };

  const vectorMock = { upsertProducts: jest.fn() } as unknown as VectorService;
  const leadsMock = { getPhoneBySession: jest.fn() } as unknown as LeadsService;
  const minioMock = {
    bucketExists: jest.fn().mockResolvedValue(true),
    makeBucket: jest.fn(),
    putObject: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.MINIO_BUCKET = 'test-bucket';
    process.env.ASSETS_CDN_BASE_URL = 'https://cdn.example.com';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorefrontService,
        { provide: STOREFRONT_REPOSITORY, useValue: sfRepo },
        { provide: STOREFRONT_PRODUCT_REPOSITORY, useValue: prodRepo },
        { provide: STOREFRONT_MERCHANT_REPOSITORY, useValue: merRepo },
        { provide: STOREFRONT_CATEGORY_REPOSITORY, useValue: catRepo },
        { provide: STOREFRONT_ORDER_REPOSITORY, useValue: orderRepo },
        { provide: VectorService, useValue: vectorMock },
        { provide: 'MINIO_CLIENT', useValue: minioMock },
        { provide: LeadsService, useValue: leadsMock },
      ],
    }).compile();

    service = module.get(StorefrontService);
  });

  it('checkSlugAvailable should normalize and query repo', async () => {
    sfRepo.existsSlug.mockResolvedValue(false);
    const out = await service.checkSlugAvailable(' My Slug ');
    expect(sfRepo.existsSlug.bind(sfRepo)).toHaveBeenCalledWith('my-slug');
    expect(out.available).toBe(true);
  });

  it('update should update slug/domain and propagate to products & vectors', async () => {
    sfRepo.findByIdOrSlugLean.mockResolvedValue({
      _id: '1' as any,
      merchant: 'm1' as any,
      slug: 'old-slug',
      domain: 'old.example.com',
    } as any);

    sfRepo.existsSlug.mockResolvedValue(false);
    sfRepo.updateById.mockResolvedValue({
      _id: '1' as any,
      merchant: 'm1' as any,
      slug: 'new-slug',
      domain: 'new.example.com',
    } as any);

    prodRepo.listIdsByMerchant.mockResolvedValue(['p1', 'p2']);

    await service.update('1', {
      slug: 'new-slug',
      domain: 'new.example.com',
    } as any);

    expect(
      prodRepo.updateManyByMerchantSet.bind(prodRepo),
    ).toHaveBeenCalledWith('m1', {
      storefrontSlug: 'new-slug',
      storefrontDomain: 'new.example.com',
    });
    expect(prodRepo.resaveById.bind(prodRepo)).toHaveBeenCalledTimes(2);
    expect((vectorMock.upsertProducts as any).mock.calls.length).toBe(2);
  });

  it('getStorefront should compose data and map banner URLs', async () => {
    sfRepo.findByIdOrSlugLean.mockResolvedValue({
      _id: 'sf1' as any,
      merchant: 'm1' as any,
      banners: [{ image: 'merchants/m1/storefront/banners/x.webp' }],
    } as any);
    merRepo.findByIdLean.mockResolvedValue({
      _id: 'm1' as any,
      name: 'Acme',
    } as any);
    prodRepo.findActiveAvailableByMerchant.mockResolvedValue([
      { _id: 'p1' as any } as any,
    ]);
    catRepo.listByMerchant.mockResolvedValue([{ _id: 'c1' as any } as any]);

    const res = await service.getStorefront('sf1');
    expect(res.merchant.name).toBe('Acme');
    expect(res.products.length).toBe(1);
    expect(res.categories.length).toBe(1);
    expect(String((res.storefront.banners ?? [])[0].image)).toContain(
      'cdn.example.com',
    );
  });

  it('getMyOrdersForSession should fall back to leads phone and query orders', async () => {
    (leadsMock.getPhoneBySession as any).mockResolvedValue('0555');
    orderRepo.findMyOrders.mockResolvedValue([{ _id: 'o1' as any } as any]);

    const out = await service.getMyOrdersForSession('m1', 's1', undefined, 10);
    expect(leadsMock.getPhoneBySession.bind(leadsMock)).toHaveBeenCalledWith(
      'm1',
      's1',
    );
    expect(orderRepo.findMyOrders.bind(orderRepo)).toHaveBeenCalledWith('m1', {
      sessionId: 's1',
      phone: '0555',
      limit: 10,
    });
    expect(out.orders.length).toBe(1);
  });

  it('getBrandCssBySlug should produce CSS', async () => {
    sfRepo.findByIdOrSlugLean.mockResolvedValue({
      _id: 'sf',
      brandDark: '#111827',
    } as any);
    const css = await service.getBrandCssBySlug('sf');
    expect(css).toContain('--brand: #111827');
  });

  it('uploadBannerImagesToMinio should respect max banners', async () => {
    sfRepo.findByMerchant.mockResolvedValue({
      _id: 'sf',
      banners: [1, 2, 3, 4, 5] as any,
    } as any);
    await expect(
      service.uploadBannerImagesToMinio('m1', [
        { path: '/tmp/x', mimetype: 'image/png' } as any,
      ]),
    ).rejects.toThrow();
  });
});
