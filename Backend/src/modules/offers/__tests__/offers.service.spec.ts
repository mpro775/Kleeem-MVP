import { Test, TestingModule } from '@nestjs/testing';
import { OffersService } from '../offers.service';
import { PRODUCT_REPOSITORY, MERCHANT_REPOSITORY } from '../tokens';
import {
  ProductRepository,
  ProductLean,
} from '../repositories/product.repository';
import { MerchantRepository } from '../repositories/merchant.repository';
import { Types } from 'mongoose';

describe('OffersService', () => {
  let service: OffersService;

  const productRepo: jest.Mocked<ProductRepository> = {
    findOffersByMerchant: jest.fn(),
  };

  const merchantRepo: jest.Mocked<MerchantRepository> = {
    getPublicSlug: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        { provide: PRODUCT_REPOSITORY, useValue: productRepo },
        { provide: MERCHANT_REPOSITORY, useValue: merchantRepo },
      ],
    }).compile();

    service = module.get(OffersService);
  });

  it('listAllOffers should map products and compute discounts', async () => {
    merchantRepo.getPublicSlug.mockResolvedValue('acme');
    const now = Date.now();
    const start = new Date(now - 3600_000).toISOString();
    const end = new Date(now + 3600_000).toISOString();

    const products: ProductLean[] = [
      {
        _id: new Types.ObjectId(),
        merchantId: new Types.ObjectId(),
        name: 'Prod 1',
        slug: 'prod-1',
        price: 100,
        currency: 'SAR',
        images: ['img1'],
        offer: {
          enabled: true,
          oldPrice: 120,
          newPrice: 90,
          startAt: start,
          endAt: end,
        },
        storefrontSlug: 'store-1',
      },
      {
        _id: new Types.ObjectId(),
        merchantId: new Types.ObjectId(),
        name: 'Prod 2',
        price: 50,
        currency: 'SAR',
        offer: { enabled: true, newPrice: 60, startAt: start, endAt: end }, // newPrice > price => no discount
      },
    ];
    productRepo.findOffersByMerchant.mockResolvedValue(products);

    const res = await service.listAllOffers('m1', { limit: 10, offset: 0 });

    expect(res).toHaveLength(2);

    const p1 = res[0];
    expect(p1.isActive).toBe(true);
    expect(p1.priceOld).toBe(120);
    expect(p1.priceNew).toBe(90);
    expect(p1.discountPct).toBe(25);
    expect(p1.url).toContain('/store/p/prod-1');

    const p2 = res[1];
    expect(p2.discountPct).toBe(null);
    expect(typeof p2.priceEffective).toBe('number');
  });

  it('listAllOffers should handle missing publicSlug and build fallback URL', async () => {
    merchantRepo.getPublicSlug.mockResolvedValue(undefined);
    productRepo.findOffersByMerchant.mockResolvedValue([
      {
        _id: new Types.ObjectId('64d2b7f7c0a3a1a1a1a1a1a1'),
        merchantId: new Types.ObjectId(),
        name: 'No Slug Product',
        currency: 'SAR',
        images: [],
        offer: { enabled: true, newPrice: 10 },
      } as any,
    ]);

    const res = await service.listAllOffers('m1', { limit: 1, offset: 0 });
    expect(res[0].url).toBeUndefined(); // لا يوجد publicSlug ولا storefront => undefined
  });
});
