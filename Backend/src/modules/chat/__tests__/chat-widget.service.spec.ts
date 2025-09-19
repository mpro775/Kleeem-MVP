import { Test } from '@nestjs/testing';
import { ChatWidgetService } from '../chat-widget.service';
import { ChatWidgetRepository } from '../repositories/chat-widget.repository';
import { HttpModule } from '@nestjs/axios';

describe('ChatWidgetService', () => {
  let service: ChatWidgetService;
  let repo: jest.Mocked<ChatWidgetRepository>;

  beforeEach(async () => {
    repo = {
      findOneByMerchant: jest.fn(),
      createDefault: jest.fn(),
      upsertAndReturn: jest.fn(),
      setWidgetSlug: jest.fn(),
      existsByWidgetSlug: jest.fn(),
      findBySlugOrPublicSlug: jest.fn(),
      getStorefrontBrand: jest.fn(),
      getMerchantPublicSlug: jest.fn(),
    } as any;

    const module = await Test.createTestingModule({
      imports: [HttpModule],
      providers: [
        ChatWidgetService,
        { provide: 'ChatWidgetRepository', useValue: repo },
      ],
    }).compile();

    service = module.get(ChatWidgetService);
  });

  it('getSettings -> creates default on first time', async () => {
    repo.findOneByMerchant.mockResolvedValue(null);
    repo.createDefault.mockResolvedValue({
      merchantId: 'm1',
      botName: 'Bot',
    } as any);
    const out = await service.getSettings('m1');
    expect(out.botName).toBe('Bot');
  });

  it('generateWidgetSlug -> appends suffix if exists', async () => {
    repo.findOneByMerchant.mockResolvedValue({
      merchantId: 'm1',
      botName: 'My Bot',
    } as any);
    repo.existsByWidgetSlug.mockResolvedValueOnce(true);
    repo.setWidgetSlug.mockResolvedValue(undefined);
    const slug = await service.generateWidgetSlug('m1');
    expect(slug.startsWith('my-bot-')).toBe(true);
  });
});
