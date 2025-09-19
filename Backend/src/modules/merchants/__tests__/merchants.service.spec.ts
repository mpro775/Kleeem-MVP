import { Test, TestingModule } from '@nestjs/testing';
import { MerchantsService } from '../merchants.service';
import { MerchantsRepository } from '../repositories/merchants.repository';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { PromptVersionService } from '../services/prompt-version.service';
import { PromptPreviewService } from '../services/prompt-preview.service';
import { StorefrontService } from '../../storefront/storefront.service';
import { CleanupCoordinatorService } from '../cleanup-coordinator.service';
import { N8nWorkflowService } from '../../n8n-workflow/n8n-workflow.service';
import { BusinessMetrics } from '../../../metrics/business.metrics';
import { ChatWidgetService } from '../../chat/chat-widget.service';
import { ConfigService } from '@nestjs/config';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let repo: jest.Mocked<MerchantsRepository>;

  beforeEach(async () => {
    const repoMock: jest.Mocked<MerchantsRepository> = {
      create: jest.fn(),
      existsByPublicSlug: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      saveBasicInfo: jest.fn(),
      remove: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      purge: jest.fn(),
      isSubscriptionActive: jest.fn(),
      buildFinalPrompt: jest.fn(),
      saveAdvancedVersion: jest.fn(),
      listAdvancedVersions: jest.fn(),
      revertAdvancedVersion: jest.fn(),
      updateQuickConfig: jest.fn(),
      getStatus: jest.fn(),
      ensureForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        { provide: 'MerchantsRepository', useValue: repoMock },
        {
          provide: PromptBuilderService,
          useValue: {
            compileTemplate: jest.fn().mockResolvedValue('compiled'),
          },
        },
        {
          provide: PromptVersionService,
          useValue: { snapshot: jest.fn(), list: jest.fn(), revert: jest.fn() },
        },
        {
          provide: PromptPreviewService,
          useValue: { preview: jest.fn().mockResolvedValue('previewed') },
        },
        {
          provide: StorefrontService,
          useValue: { create: jest.fn(), deleteByMerchant: jest.fn() },
        },
        {
          provide: CleanupCoordinatorService,
          useValue: { purgeAll: jest.fn() },
        },
        {
          provide: N8nWorkflowService,
          useValue: {
            createForMerchant: jest.fn(),
            delete: jest.fn(),
            setActive: jest.fn(),
          },
        },
        {
          provide: BusinessMetrics,
          useValue: {
            incMerchantCreated: jest.fn(),
            incN8nWorkflowCreated: jest.fn(),
          },
        },
        { provide: ChatWidgetService, useValue: { syncWidgetSlug: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
    repo = module.get('MerchantsRepository');
  });

  it('should create merchant and compile prompt', async () => {
    const mockMerchant: any = { id: '1', save: jest.fn() };
    repo.create.mockResolvedValue(mockMerchant);

    const result = await service.create({} as any);
    expect(repo.create).toHaveBeenCalled();
    expect(result).toEqual(mockMerchant);
  });

  it('should find one merchant and compile prompt', async () => {
    const mockMerchant: any = { id: '1', save: jest.fn() };
    repo.findOne.mockResolvedValue(mockMerchant);

    const result = await service.findOne('1');
    expect(repo.findOne).toHaveBeenCalledWith('1');
    expect(result).toEqual(mockMerchant);
  });

  it('should update merchant and recompile prompt', async () => {
    const mockMerchant: any = { id: '1', save: jest.fn(), set: jest.fn() };
    repo.update.mockResolvedValue(mockMerchant);

    const result = await service.update('1', { name: 'New Name' } as any);
    expect(repo.update).toHaveBeenCalledWith('1', { name: 'New Name' });
    expect(result).toEqual(mockMerchant);
  });

  it('should remove merchant', async () => {
    repo.remove.mockResolvedValue({ message: 'Merchant deleted successfully' });

    const result = await service.remove('1');
    expect(repo.remove).toHaveBeenCalledWith('1');
    expect(result).toEqual({ message: 'Merchant deleted successfully' });
  });
});
