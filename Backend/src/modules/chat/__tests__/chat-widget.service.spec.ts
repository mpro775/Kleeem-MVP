import { HttpModule } from '@nestjs/axios';
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ChatWidgetService } from '../chat-widget.service';

import type { ChatWidgetRepository } from '../repositories/chat-widget.repository';

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

  describe('syncWidgetSlug', () => {
    it('should sync widget slug successfully', async () => {
      const merchantId = 'm1';
      const slug = 'test-slug';

      repo.setWidgetSlug.mockResolvedValue(undefined);

      const result = await service.syncWidgetSlug(merchantId, slug);

      expect(repo.setWidgetSlug).toHaveBeenCalledWith(merchantId, slug);
      expect(result).toBe(slug);
    });
  });

  describe('getSettings', () => {
    it('should return existing settings when found', async () => {
      const merchantId = 'm1';
      const existingSettings = {
        merchantId,
        botName: 'Existing Bot',
        widgetSlug: 'existing-slug',
      } as any;

      repo.findOneByMerchant.mockResolvedValue(existingSettings);

      const result = await service.getSettings(merchantId);

      expect(repo.findOneByMerchant).toHaveBeenCalledWith(merchantId);
      expect(repo.createDefault).not.toHaveBeenCalled();
      expect(result).toBe(existingSettings);
    });

    it('should create default settings on first time', async () => {
      const merchantId = 'm1';
      const defaultSettings = {
        merchantId,
        botName: 'Bot',
      } as any;

      repo.findOneByMerchant.mockResolvedValue(null);
      repo.createDefault.mockResolvedValue(defaultSettings);

      const result = await service.getSettings(merchantId);

      expect(repo.findOneByMerchant).toHaveBeenCalledWith(merchantId);
      expect(repo.createDefault).toHaveBeenCalledWith(merchantId);
      expect(result).toBe(defaultSettings);
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const merchantId = 'm1';
      const dto = { botName: 'Updated Bot', embedMode: 'iframe' } as any;
      const updatedSettings = {
        merchantId,
        botName: 'Updated Bot',
        embedMode: 'iframe',
      } as any;

      repo.upsertAndReturn.mockResolvedValue(updatedSettings);

      const result = await service.updateSettings(merchantId, dto);

      expect(repo.upsertAndReturn).toHaveBeenCalledWith(merchantId, dto);
      expect(result).toBe(updatedSettings);
    });

    it('should throw NotFoundException when settings not found', async () => {
      const merchantId = 'm1';
      const dto = { botName: 'Updated Bot' } as any;

      repo.upsertAndReturn.mockResolvedValue(null as any);

      await expect(service.updateSettings(merchantId, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.upsertAndReturn).toHaveBeenCalledWith(merchantId, dto);
    });
  });

  describe('generateWidgetSlug', () => {
    it('should generate slug without suffix when unique', async () => {
      const merchantId = 'm1';
      const settings = {
        merchantId,
        botName: 'My Bot',
      } as any;

      repo.findOneByMerchant.mockResolvedValue(settings);
      repo.existsByWidgetSlug.mockResolvedValue(false);
      repo.setWidgetSlug.mockResolvedValue(undefined);

      const result = await service.generateWidgetSlug(merchantId);

      expect(result).toBe('my-bot');
      expect(repo.setWidgetSlug).toHaveBeenCalledWith(merchantId, 'my-bot');
    });

    it('should generate slug with suffix when exists', async () => {
      const merchantId = 'm1';
      const settings = {
        merchantId,
        botName: 'My Bot',
      } as any;

      repo.findOneByMerchant.mockResolvedValue(settings);
      repo.existsByWidgetSlug.mockResolvedValueOnce(true);
      repo.setWidgetSlug.mockResolvedValue(undefined);

      const result = await service.generateWidgetSlug(merchantId);

      expect(result).toMatch(/^my-bot-[a-z0-9]{6}$/);
      expect(repo.setWidgetSlug).toHaveBeenCalledWith(merchantId, result);
    });

    it('should generate default slug when botName is empty', async () => {
      const merchantId = 'm1';
      const settings = {
        merchantId,
        botName: '',
      } as any;

      repo.findOneByMerchant.mockResolvedValue(settings);
      repo.existsByWidgetSlug.mockResolvedValue(false);
      repo.setWidgetSlug.mockResolvedValue(undefined);

      const result = await service.generateWidgetSlug(merchantId);

      expect(result).toBe('bot');
      expect(repo.setWidgetSlug).toHaveBeenCalledWith(merchantId, 'bot');
    });

    it('should clean botName and generate valid slug', async () => {
      const merchantId = 'm1';
      const settings = {
        merchantId,
        botName: 'My Bot & Chat!@#',
      } as any;

      repo.findOneByMerchant.mockResolvedValue(settings);
      repo.existsByWidgetSlug.mockResolvedValue(false);
      repo.setWidgetSlug.mockResolvedValue(undefined);

      const result = await service.generateWidgetSlug(merchantId);

      expect(result).toBe('my-bot-chat');
      expect(repo.setWidgetSlug).toHaveBeenCalledWith(
        merchantId,
        'my-bot-chat',
      );
    });
  });

  describe('getSettingsBySlugOrPublicSlug', () => {
    it('should return settings when found by slug', async () => {
      const slug = 'test-slug';
      const settings = {
        merchantId: 'm1',
        widgetSlug: slug,
      } as any;

      repo.findBySlugOrPublicSlug.mockResolvedValue(settings);

      const result = await service.getSettingsBySlugOrPublicSlug(slug);

      expect(repo.findBySlugOrPublicSlug).toHaveBeenCalledWith(slug);
      expect(result).toBe(settings);
    });

    it('should return null when not found', async () => {
      const slug = 'nonexistent-slug';

      repo.findBySlugOrPublicSlug.mockResolvedValue(null);

      const result = await service.getSettingsBySlugOrPublicSlug(slug);

      expect(repo.findBySlugOrPublicSlug).toHaveBeenCalledWith(slug);
      expect(result).toBeNull();
    });
  });

  describe('getEmbedSettings', () => {
    it('should return embed settings without storefront brand', async () => {
      const merchantId = 'm1';
      const settings = {
        merchantId,
        embedMode: 'iframe',
        headerBgColor: '#ffffff',
        brandColor: '#000000',
        useStorefrontBrand: false,
      } as any;

      repo.findOneByMerchant.mockResolvedValue(settings);
      repo.getMerchantPublicSlug.mockResolvedValue('public-slug');

      const result = await service.getEmbedSettings(merchantId);

      expect(result).toEqual({
        embedMode: 'iframe',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
        shareUrl: '/public-slug/chat',
        colors: {
          headerBgColor: '#ffffff',
          brandColor: '#000000',
          onHeader: '#FFFFFF',
        },
      });
    });

    it('should return embed settings with storefront brand', async () => {
      const merchantId = 'm1';
      const settings = {
        merchantId,
        embedMode: 'bubble',
        headerBgColor: '#ffffff',
        brandColor: '#000000',
        useStorefrontBrand: true,
      } as any;
      const storefrontBrand = {
        brandDark: '#333333',
      };

      repo.findOneByMerchant.mockResolvedValue(settings);
      repo.getStorefrontBrand.mockResolvedValue(storefrontBrand);
      repo.getMerchantPublicSlug.mockResolvedValue('public-slug');

      const result = await service.getEmbedSettings(merchantId);

      expect(result).toEqual({
        embedMode: 'bubble',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
        shareUrl: '/public-slug/chat',
        colors: {
          headerBgColor: '#333333',
          brandColor: '#333333',
          onHeader: '#FFFFFF',
        },
      });
    });

    it('should throw NotFoundException when settings not found', async () => {
      const merchantId = 'm1';

      repo.findOneByMerchant.mockResolvedValue(null);

      await expect(service.getEmbedSettings(merchantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle null storefront brand gracefully', async () => {
      const merchantId = 'm1';
      const settings = {
        merchantId,
        embedMode: 'bar',
        headerBgColor: '#ffffff',
        brandColor: '#000000',
        useStorefrontBrand: true,
      } as any;

      repo.findOneByMerchant.mockResolvedValue(settings);
      repo.getStorefrontBrand.mockResolvedValue(null);
      repo.getMerchantPublicSlug.mockResolvedValue(null);

      const result = await service.getEmbedSettings(merchantId);

      expect(result.shareUrl).toBe('/chat');
      expect(result.colors.headerBgColor).toBe('#ffffff'); // fallback to original
      expect(result.colors.brandColor).toBe('#000000'); // fallback to original
    });
  });

  describe('updateEmbedSettings', () => {
    it('should update embed mode successfully', async () => {
      const merchantId = 'm1';
      const dto = { embedMode: 'popup' };
      const updatedSettings = {
        merchantId,
        embedMode: 'popup',
        widgetSlug: 'test-slug',
      } as any;

      repo.upsertAndReturn.mockResolvedValue(updatedSettings);

      const result = await service.updateEmbedSettings(merchantId, dto);

      expect(repo.upsertAndReturn).toHaveBeenCalledWith(merchantId, {
        embedMode: 'popup',
      });
      expect(result).toEqual({
        embedMode: 'popup',
        shareUrl: '/chat/test-slug',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
      });
    });

    it('should update with undefined embedMode', async () => {
      const merchantId = 'm1';
      const dto = {}; // embedMode is undefined
      const updatedSettings = {
        merchantId,
        embedMode: 'iframe',
        widgetSlug: 'test-slug',
      } as any;

      repo.upsertAndReturn.mockResolvedValue(updatedSettings);

      const result = await service.updateEmbedSettings(merchantId, dto);

      expect(repo.upsertAndReturn).toHaveBeenCalledWith(merchantId, {});
      expect(result.embedMode).toBe('iframe');
    });

    it('should throw NotFoundException when settings not found', async () => {
      const merchantId = 'm1';
      const dto = { embedMode: 'bar' };

      repo.upsertAndReturn.mockResolvedValue(null as any);

      await expect(
        service.updateEmbedSettings(merchantId, dto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
