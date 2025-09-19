import { Test, TestingModule } from '@nestjs/testing';
import { MerchantCacheService } from '../merchant-cache.service';
import { ConfigService } from '@nestjs/config';
import { PromptBuilderService } from '../prompt-builder.service';
import { TranslationService } from '../../../../common/services/translation.service';

const repo = { findOne: jest.fn(), getStatus: jest.fn() };
const prompt = { compileTemplate: jest.fn() };
const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
const t = { translate: (k: string) => k };
const config = {
  get: jest.fn((key: string) => {
    if (key === 'vars.cache.merchantTtlMs') return 600000;
    if (key === 'vars.cache.merchantStatusTtlMs') return 300000;
    if (key === 'vars.cache.merchantPromptTtlMs') return 1800000;
    return 600000;
  }),
};

describe('MerchantCacheService', () => {
  let svc: MerchantCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantCacheService,
        { provide: 'MerchantsRepository', useValue: repo },
        { provide: PromptBuilderService, useValue: prompt },
        { provide: TranslationService, useValue: t },
        { provide: 'CACHE_MANAGER', useValue: cache },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    svc = module.get(MerchantCacheService);
    jest.resetAllMocks();
  });

  it('caches merchant on findOne - cache miss', async () => {
    const merchant = { _id: 'id1', name: 'Test', save: jest.fn() };
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(merchant);
    prompt.compileTemplate.mockResolvedValue('Compiled Template');

    const result = await svc.findOne('id1');

    expect(cache.get).toHaveBeenCalledWith('merchant:id1');
    expect(repo.findOne).toHaveBeenCalledWith('id1');
    expect(prompt.compileTemplate).toHaveBeenCalledWith(merchant);
    expect(config.get).toHaveBeenCalledWith('vars.cache.merchantTtlMs');
    expect(cache.set).toHaveBeenCalledWith('merchant:id1', merchant, 600000);
    expect(merchant.save).toHaveBeenCalled();
    expect(result).toBe(merchant);
  });

  it('returns cached merchant on findOne - cache hit', async () => {
    const cachedMerchant = { _id: 'id1', name: 'Cached' };
    cache.get.mockResolvedValue(cachedMerchant);

    const result = await svc.findOne('id1');

    expect(cache.get).toHaveBeenCalledWith('merchant:id1');
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(prompt.compileTemplate).not.toHaveBeenCalled();
    expect(cache.set).not.toHaveBeenCalled();
    expect(result).toBe(cachedMerchant);
  });

  it('throws NotFoundException when merchant not found', async () => {
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(null);

    await expect(svc.findOne('id1')).rejects.toThrow(
      'merchants.errors.notFound',
    );
    expect(cache.get).toHaveBeenCalledWith('merchant:id1');
    expect(repo.findOne).toHaveBeenCalledWith('id1');
  });

  it('caches status on getStatus - cache miss', async () => {
    const status = { isActive: true, subscription: 'premium' };
    cache.get.mockResolvedValue(null);
    repo.getStatus.mockResolvedValue(status);

    const result = await svc.getStatus('id1');

    expect(cache.get).toHaveBeenCalledWith('merchant:status:id1');
    expect(repo.getStatus).toHaveBeenCalledWith('id1');
    expect(config.get).toHaveBeenCalledWith('vars.cache.merchantStatusTtlMs');
    expect(cache.set).toHaveBeenCalledWith(
      'merchant:status:id1',
      status,
      300000,
    );
    expect(result).toBe(status);
  });

  it('returns cached status on getStatus - cache hit', async () => {
    const cachedStatus = { isActive: true };
    cache.get.mockResolvedValue(cachedStatus);

    const result = await svc.getStatus('id1');

    expect(cache.get).toHaveBeenCalledWith('merchant:status:id1');
    expect(repo.getStatus).not.toHaveBeenCalled();
    expect(result).toBe(cachedStatus);
  });

  it('caches prompt on buildFinalPrompt - cache miss', async () => {
    const merchant = { _id: 'id1', name: 'Test', save: jest.fn() };
    const compiledTemplate = 'Compiled Template';
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(merchant);
    prompt.compileTemplate.mockResolvedValue(compiledTemplate);

    const result = await svc.buildFinalPrompt('id1');

    expect(cache.get).toHaveBeenCalledWith('merchant:prompt:id1');
    expect(repo.findOne).toHaveBeenCalledWith('id1');
    expect(prompt.compileTemplate).toHaveBeenCalledWith(merchant);
    expect(config.get).toHaveBeenCalledWith('vars.cache.merchantPromptTtlMs');
    expect(cache.set).toHaveBeenCalledWith(
      'merchant:prompt:id1',
      compiledTemplate,
      1800000,
    );
    expect(result).toBe(compiledTemplate);
  });

  it('returns cached prompt on buildFinalPrompt - cache hit', async () => {
    const cachedPrompt = 'Cached Prompt';
    cache.get.mockResolvedValue(cachedPrompt);

    const result = await svc.buildFinalPrompt('id1');

    expect(cache.get).toHaveBeenCalledWith('merchant:prompt:id1');
    expect(repo.findOne).not.toHaveBeenCalled();
    expect(prompt.compileTemplate).not.toHaveBeenCalled();
    expect(result).toBe(cachedPrompt);
  });

  it('invalidates all cache keys for merchant', async () => {
    await svc.invalidate('m1');

    expect(cache.del).toHaveBeenCalledTimes(3);
    expect(cache.del).toHaveBeenCalledWith('merchant:m1');
    expect(cache.del).toHaveBeenCalledWith('merchant:status:m1');
    expect(cache.del).toHaveBeenCalledWith('merchant:prompt:m1');
  });

  it('gets store context with merchant data', async () => {
    const merchant = {
      _id: 'm1',
      name: 'Test Merchant',
      description: 'Test Description',
    };
    cache.get.mockResolvedValue(merchant);

    const result = await svc.getStoreContext('m1');

    expect(result).toEqual({
      merchantId: 'm1',
      name: 'Test Merchant',
      description: 'Test Description',
    });
  });

  it('uses correct TTL values from config', async () => {
    config.get
      .mockReturnValueOnce(600000) // merchant TTL
      .mockReturnValueOnce(300000) // status TTL
      .mockReturnValueOnce(1800000); // prompt TTL

    const merchant = { _id: 'id1', name: 'Test', save: jest.fn() };
    cache.get.mockResolvedValue(null);
    repo.findOne.mockResolvedValue(merchant);
    prompt.compileTemplate.mockResolvedValue('Template');

    await svc.findOne('id1');
    expect(cache.set).toHaveBeenCalledWith('merchant:id1', merchant, 600000);

    const status = { isActive: true };
    repo.getStatus.mockResolvedValue(status);
    await svc.getStatus('id1');
    expect(cache.set).toHaveBeenCalledWith(
      'merchant:status:id1',
      status,
      300000,
    );

    await svc.buildFinalPrompt('id1');
    expect(cache.set).toHaveBeenCalledWith(
      'merchant:prompt:id1',
      'Template',
      1800000,
    );
  });
});
