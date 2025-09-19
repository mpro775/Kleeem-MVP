import { Test, TestingModule } from '@nestjs/testing';
import { MerchantPromptController } from '../controllers/merchant-prompt.controller';
import { MerchantsService } from '../merchants.service';
import { PromptVersionService } from '../services/prompt-version.service';
import { PromptPreviewService } from '../services/prompt-preview.service';
import { StorefrontService } from '../../storefront/storefront.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { QuickConfigDto } from '../dto/requests/quick-config.dto';
import { AdvancedTemplateDto } from '../dto/requests/advanced-template.dto';
import { PreviewPromptDto } from '../dto/requests/preview-prompt.dto';

describe('MerchantPromptController', () => {
  let controller: MerchantPromptController;
  let merchantsService: jest.Mocked<MerchantsService>;
  let versionService: jest.Mocked<PromptVersionService>;
  let previewService: jest.Mocked<PromptPreviewService>;
  let storefrontService: jest.Mocked<StorefrontService>;
  let promptBuilder: jest.Mocked<PromptBuilderService>;

  const mockMerchant = {
    _id: '64a00000000000000000001',
    name: 'Test Merchant',
    quickConfig: {
      businessName: 'Test Business',
      businessType: 'retail',
      targetAudience: 'general',
    },
    currentAdvancedConfig: {
      template: 'default template content',
      note: 'Default template',
    },
    finalPromptTemplate: 'Final prompt content',
  };

  beforeEach(async () => {
    const mockMerchantsService = {
      findOne: jest.fn(),
      updateQuickConfig: jest.fn(),
      updateAdvancedConfig: jest.fn(),
      saveAdvancedVersion: jest.fn(),
    };

    const mockVersionService = {
      snapshot: jest.fn(),
      list: jest.fn(),
      revert: jest.fn(),
    };

    const mockStorefrontService = {
      findByMerchantId: jest.fn(),
    };

    const mockPromptBuilder = {
      buildFromQuickConfig: jest.fn(),
    };

    const mockPreviewService = {
      preview: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MerchantPromptController],
      providers: [
        { provide: MerchantsService, useValue: mockMerchantsService },
        { provide: PromptVersionService, useValue: mockVersionService },
        { provide: PromptPreviewService, useValue: mockPreviewService },
        { provide: StorefrontService, useValue: mockStorefrontService },
        { provide: PromptBuilderService, useValue: mockPromptBuilder },
      ],
    }).compile();

    controller = module.get<MerchantPromptController>(MerchantPromptController);
    merchantsService = module.get(MerchantsService);
    versionService = module.get(PromptVersionService);
    previewService = module.get(PromptPreviewService);
    storefrontService = module.get(StorefrontService);
    promptBuilder = module.get(PromptBuilderService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getQuickConfig', () => {
    it('should return quick config for merchant', async () => {
      merchantsService.findOne.mockResolvedValue(mockMerchant as any);

      const result = await controller.getQuickConfig('64a00000000000000000001');

      expect(merchantsService.findOne).toHaveBeenCalledWith(
        '64a00000000000000000001',
      );
      expect(result).toEqual(mockMerchant.quickConfig);
    });
  });

  describe('updateQuickConfig', () => {
    it('should update quick config', async () => {
      const quickConfigDto: QuickConfigDto = {
        businessName: 'Updated Business',
        businessType: 'ecommerce',
        targetAudience: 'young adults',
      } as QuickConfigDto;

      const updatedMerchant = {
        ...mockMerchant,
        quickConfig: quickConfigDto,
      };

      merchantsService.updateQuickConfig.mockResolvedValue(
        quickConfigDto as any,
      );

      const result = await controller.updateQuickConfig(
        '64a00000000000000000001',
        quickConfigDto,
      );

      expect(merchantsService.updateQuickConfig).toHaveBeenCalledWith(
        '64a00000000000000000001',
        quickConfigDto,
      );
      expect(result).toEqual(quickConfigDto);
    });
  });

  describe('getAdvancedConfig', () => {
    it('should return advanced config for merchant', async () => {
      merchantsService.findOne.mockResolvedValue(mockMerchant as any);

      const result = await controller.getAdvancedTemplate(
        '64a00000000000000000001',
      );

      expect(merchantsService.findOne).toHaveBeenCalledWith(
        '64a00000000000000000001',
      );
      expect(result).toEqual({
        template: mockMerchant.currentAdvancedConfig.template,
        note: mockMerchant.currentAdvancedConfig.note,
      });
    });
  });

  describe('preview', () => {
    it('should generate prompt preview', async () => {
      const previewDto: PreviewPromptDto = {
        userMessage: 'Hello, I need help with my order',
        useAdvanced: true,
        testVars: { businessName: 'Test Business' },
        quickConfig: {
          businessName: 'Test Business',
          businessType: 'retail',
          targetAudience: 'general',
        },
      } as PreviewPromptDto;

      const mockPreview = 'Generated prompt content';

      // Mock the service methods
      merchantsService.findOne.mockResolvedValue(mockMerchant as any);
      promptBuilder.buildFromQuickConfig.mockReturnValue(
        'Quick config template',
      );
      previewService.preview.mockReturnValue(mockPreview);

      const result = await controller.preview(
        '64a00000000000000000001',
        previewDto,
      );

      expect(merchantsService.findOne).toHaveBeenCalledWith(
        '64a00000000000000000001',
      );
      expect(result).toEqual({ preview: mockPreview });
    });
  });

  describe('saveAdvancedTemplate', () => {
    it('should save advanced template and create snapshot', async () => {
      const advancedDto: AdvancedTemplateDto = {
        template: 'Custom template content',
        note: 'Updated template',
        updatedAt: new Date(),
      } as AdvancedTemplateDto;

      merchantsService.findOne.mockResolvedValue(mockMerchant as any);
      merchantsService.saveAdvancedVersion.mockResolvedValue(undefined);

      const result = await controller.saveAdvancedTemplate(
        '64a00000000000000000001',
        advancedDto,
      );

      expect(versionService.snapshot).toHaveBeenCalledWith(
        '64a00000000000000000001',
        advancedDto.note,
      );
      expect(merchantsService.saveAdvancedVersion).toHaveBeenCalledWith(
        '64a00000000000000000001',
        advancedDto.template,
        advancedDto.note,
      );
      expect(result).toEqual({ message: 'Advanced template saved' });
    });
  });

  describe('listVersions', () => {
    it('should return all versions for merchant', async () => {
      const mockVersions = [
        { template: 'Template 1', note: 'Version 1', updatedAt: new Date() },
        { template: 'Template 2', note: 'Version 2', updatedAt: new Date() },
      ];

      versionService.list.mockResolvedValue(mockVersions as any);

      const result = await controller.listVersions('64a00000000000000000001');

      expect(versionService.list).toHaveBeenCalledWith(
        '64a00000000000000000001',
      );
      expect(result).toEqual(mockVersions);
    });
  });

  describe('revertVersion', () => {
    it('should revert to a specific version', async () => {
      const versionIndex = 1;

      versionService.revert.mockResolvedValue(undefined);

      const result = await controller.revertVersion(
        '64a00000000000000000001',
        versionIndex,
      );

      expect(versionService.revert).toHaveBeenCalledWith(
        '64a00000000000000000001',
        versionIndex,
      );
      expect(result).toEqual({
        message: `Reverted to version ${versionIndex}`,
      });
    });
  });

  describe('finalPrompt', () => {
    it('should return final prompt template', async () => {
      const mockMerchantWithPrompt = {
        ...mockMerchant,
        finalPromptTemplate: 'Final prompt template content',
      };

      merchantsService.findOne.mockResolvedValue(mockMerchantWithPrompt as any);

      const result = await controller.finalPrompt('64a00000000000000000001');

      expect(merchantsService.findOne).toHaveBeenCalledWith(
        '64a00000000000000000001',
      );
      expect(result).toEqual({
        prompt: mockMerchantWithPrompt.finalPromptTemplate,
      });
    });

    it('should throw error when final prompt not configured', async () => {
      const mockMerchantWithoutPrompt = {
        ...mockMerchant,
        finalPromptTemplate: undefined,
      };

      merchantsService.findOne.mockResolvedValue(
        mockMerchantWithoutPrompt as any,
      );

      await expect(
        controller.finalPrompt('64a00000000000000000001'),
      ).rejects.toThrow('Final prompt not configured');
    });
  });
});
