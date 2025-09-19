import { Test } from '@nestjs/testing';
import { MerchantChecklistService } from '../merchant-checklist.service';
import { MerchantChecklistRepository } from '../repositories/merchant-checklist.repository';
import { StorefrontService } from '../../storefront/storefront.service';
import { ChannelStatus } from '../../channels/schemas/channel.schema';

describe('MerchantChecklistService', () => {
  let service: MerchantChecklistService;
  let repo: jest.Mocked<MerchantChecklistRepository>;
  let storefront: { findByMerchant: jest.Mock };

  beforeEach(async () => {
    repo = {
      findMerchantLean: jest.fn(),
      countProducts: jest.fn(),
      countCategories: jest.fn(),
      getDefaultOrEnabledOrAnyChannel: jest.fn(),
    };
    storefront = { findByMerchant: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        MerchantChecklistService,
        { provide: 'MerchantChecklistRepository', useValue: repo },
        { provide: StorefrontService, useValue: storefront },
      ],
    }).compile();

    service = module.get(MerchantChecklistService);
  });

  it('builds checklist with channels and store info', async () => {
    repo.findMerchantLean.mockResolvedValue({
      logoUrl: '',
      addresses: [],
      publicSlug: 'my-shop',
      publicSlugEnabled: true,
      quickConfig: {
        dialect: 'خليجي',
        tone: 'ودّي',
        includeClosingPhrase: true,
        closingText: 'هل أقدر أساعدك بشي ثاني؟ 😊',
        customInstructions: [],
      },
      productSourceConfig: { salla: { active: false }, zid: { active: false } },
      workingHours: [],
      returnPolicy: '',
      exchangePolicy: '',
      shippingPolicy: '',
      skippedChecklistItems: [],
    } as any);

    repo.countProducts.mockResolvedValue(0);
    repo.countCategories.mockResolvedValue(0);
    repo.getDefaultOrEnabledOrAnyChannel.mockResolvedValue({
      enabled: true,
      status: ChannelStatus.CONNECTED,
      isDefault: true,
      updatedAt: new Date(),
    } as any);

    storefront.findByMerchant.mockResolvedValue({ banners: [] });

    const res = await service.getChecklist('m1');
    expect(res).toBeInstanceOf(Array);
    expect(res.find((g) => g.key === 'channels')?.items.length).toBeGreaterThan(
      0,
    );
  });
});
