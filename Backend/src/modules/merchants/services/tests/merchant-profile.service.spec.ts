import { Test, TestingModule } from '@nestjs/testing';
import { MerchantProfileService } from '../merchant-profile.service';
import { PromptBuilderService } from '../prompt-builder.service';
import { ChatWidgetService } from '../../../chat/chat-widget.service';
import { MerchantCacheService } from '../merchant-cache.service';

const repo = {
  update: jest.fn(),
  saveBasicInfo: jest.fn(),
  findOne: jest.fn()
};
const prompts = { compileTemplate: jest.fn() };
const chat = { syncWidgetSlug: jest.fn() };
const cache = { invalidate: jest.fn() };

describe('MerchantProfileService', () => {
  let svc: MerchantProfileService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantProfileService,
        { provide: 'MerchantsRepository', useValue: repo },
        { provide: PromptBuilderService, useValue: prompts },
        { provide: ChatWidgetService, useValue: chat },
        { provide: MerchantCacheService, useValue: cache },
      ],
    }).compile();
    svc = module.get(MerchantProfileService);
    jest.resetAllMocks();
  });

  it('update -> compiles prompt + invalidates cache', async () => {
    const doc = {
      set: jest.fn(),
      save: jest.fn()
    };
    repo.update.mockResolvedValue(doc);
    prompts.compileTemplate.mockResolvedValue('TPL');

    const result = await svc.update('m1', {
      publicSlug: 'store-1'
    } as any);

    expect(repo.update).toHaveBeenCalledWith('m1', {
      publicSlug: 'store-1'
    });
    expect(chat.syncWidgetSlug).toHaveBeenCalledWith('m1', 'store-1');
    expect(prompts.compileTemplate).toHaveBeenCalledWith(doc);
    expect(doc.set).toHaveBeenCalledWith('finalPromptTemplate', 'TPL');
    expect(doc.save).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
    expect(result).toBe(doc);
  });

  it('update -> handles syncWidgetSlug failure gracefully', async () => {
    const doc = {
      set: jest.fn(),
      save: jest.fn()
    };
    repo.update.mockResolvedValue(doc);
    prompts.compileTemplate.mockResolvedValue('TPL');
    chat.syncWidgetSlug.mockRejectedValue(new Error('sync failed'));

    await svc.update('m1', {
      publicSlug: 'store-1'
    } as any);

    expect(chat.syncWidgetSlug).toHaveBeenCalledWith('m1', 'store-1');
    expect(prompts.compileTemplate).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
  });

  it('update -> handles compileTemplate failure gracefully', async () => {
    const doc = {
      set: jest.fn(),
      save: jest.fn()
    };
    repo.update.mockResolvedValue(doc);
    prompts.compileTemplate.mockRejectedValue(new Error('compile failed'));
    chat.syncWidgetSlug.mockResolvedValue(undefined);

    await svc.update('m1', {
      publicSlug: 'store-1'
    } as any);

    expect(chat.syncWidgetSlug).toHaveBeenCalledWith('m1', 'store-1');
    expect(prompts.compileTemplate).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
  });

  it('update -> works without publicSlug', async () => {
    const doc = {
      set: jest.fn(),
      save: jest.fn()
    };
    repo.update.mockResolvedValue(doc);
    prompts.compileTemplate.mockResolvedValue('TPL');

    await svc.update('m1', {
      name: 'New Name'
    } as any);

    expect(chat.syncWidgetSlug).not.toHaveBeenCalled();
    expect(prompts.compileTemplate).toHaveBeenCalledWith(doc);
    expect(cache.invalidate).toHaveBeenCalledWith('m1');
  });

  it('saveBasicInfo -> delegates to repository', async () => {
    const dto = { name: 'Test', email: 'test@example.com' };
    repo.saveBasicInfo.mockResolvedValue('saved');

    const result = await svc.saveBasicInfo('m1', dto as any);

    expect(repo.saveBasicInfo).toHaveBeenCalledWith('m1', dto);
    expect(result).toBe('saved');
  });
});
