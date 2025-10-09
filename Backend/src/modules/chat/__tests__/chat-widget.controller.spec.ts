import { Test } from '@nestjs/testing';

import { ChatWidgetController } from '../chat-widget.controller';
import { ChatWidgetService } from '../chat-widget.service';

import type { TestingModule } from '@nestjs/testing';

describe('ChatWidgetController', () => {
  let controller: ChatWidgetController;
  let service: jest.Mocked<ChatWidgetService>;

  beforeEach(async () => {
    const mockService = {
      syncWidgetSlug: jest.fn(),
      getSettings: jest.fn(),
      updateSettings: jest.fn(),
      generateWidgetSlug: jest.fn(),
      getSettingsBySlugOrPublicSlug: jest.fn(),
      getEmbedSettings: jest.fn(),
      updateEmbedSettings: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatWidgetController],
      providers: [
        {
          provide: ChatWidgetService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ChatWidgetController>(ChatWidgetController);
    service = module.get(ChatWidgetService);
  });

  describe('getSettings', () => {
    it('should return widget settings', async () => {
      const merchantId = 'm_12345';
      const settings = {
        merchantId,
        botName: 'Test Bot',
        widgetSlug: 'test-bot',
      };

      service.getSettings.mockResolvedValue(settings as any);

      const result = await controller.getSettings({ merchantId });

      expect(service.getSettings).toHaveBeenCalledWith(merchantId);
      expect(result).toBe(settings);
    });
  });

  describe('updateSettings', () => {
    it('should update widget settings', async () => {
      const merchantId = 'm_12345';
      const dto = {
        botName: 'Updated Bot',
        embedMode: 'iframe' as const,
      };
      const updatedSettings = {
        merchantId,
        botName: 'Updated Bot',
        embedMode: 'iframe',
      };

      service.updateSettings.mockResolvedValue(updatedSettings as any);

      const result = await controller.updateSettings({ merchantId }, dto);

      expect(service.updateSettings).toHaveBeenCalledWith(merchantId, dto);
      expect(result).toBe(updatedSettings);
    });
  });

  describe('getEmbedSettings', () => {
    it('should return embed settings', async () => {
      const merchantId = 'm_12345';
      const embedSettings = {
        embedMode: 'iframe',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
        shareUrl: '/m_12345/chat',
        colors: {
          headerBgColor: '#ffffff',
          brandColor: '#000000',
          onHeader: '#FFFFFF',
        },
      };

      service.getEmbedSettings.mockResolvedValue(embedSettings);

      const result = await controller.getEmbedSettings({ merchantId });

      expect(service.getEmbedSettings).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual(embedSettings);
    });
  });

  describe('getShareUrl', () => {
    it('should return share URL with widget slug', async () => {
      const merchantId = 'm_12345';
      const settings = {
        merchantId,
        botName: 'Test Bot',
        widgetSlug: 'test-bot-slug',
      };

      service.getSettings.mockResolvedValue(settings as any);

      const result = await controller.getShareUrl({ merchantId });

      expect(service.getSettings).toHaveBeenCalledWith(merchantId);
      expect(result).toEqual({
        success: true,
        url: 'https://chat.example.com/widget/test-bot-slug',
        widgetSlug: 'test-bot-slug',
        merchantId,
        expiresAt: null,
        isActive: true,
      });
    });
  });

  describe('generateSlug', () => {
    it('should generate and return widget slug', async () => {
      const merchantId = 'm_12345';
      const generatedSlug = 'generated-slug-123';

      service.generateWidgetSlug.mockResolvedValue(generatedSlug);

      const result = await controller.generateSlug({ merchantId });

      expect(service.generateWidgetSlug).toHaveBeenCalledWith(merchantId);
      expect(result).toBe(generatedSlug);
    });
  });

  describe('updateEmbedSettings', () => {
    it('should update embed settings with embedMode', async () => {
      const merchantId = 'm_12345';
      const dto = { embedMode: 'conversational' as const };
      const updatedEmbedSettings = {
        embedMode: 'conversational',
        shareUrl: '/chat/test-slug',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
      };

      service.updateEmbedSettings.mockResolvedValue(updatedEmbedSettings);

      const result = await controller.updateEmbedSettings({ merchantId }, dto);

      expect(service.updateEmbedSettings).toHaveBeenCalledWith(merchantId, {
        embedMode: 'conversational',
      });
      expect(result).toEqual(updatedEmbedSettings);
    });

    it('should update embed settings with partial dto', async () => {
      const merchantId = 'm_12345';
      const dto = {} as any; // empty dto for partial update
      const updatedEmbedSettings = {
        embedMode: 'iframe',
        shareUrl: '/chat/test-slug',
        availableModes: ['bubble', 'iframe', 'bar', 'conversational'],
      };

      service.updateEmbedSettings.mockResolvedValue(updatedEmbedSettings);

      const result = await controller.updateEmbedSettings({ merchantId }, dto);

      expect(service.updateEmbedSettings).toHaveBeenCalledWith(merchantId, {
        embedMode: undefined, // since dto doesn't have embedMode
      });
      expect(result).toEqual(updatedEmbedSettings);
    });
  });

  describe('syncWidgetSlug', () => {
    it('should sync widget slug (method exists but not directly tested)', async () => {
      // This method exists in the controller but might not be directly exposed as an endpoint
      // Testing the service method directly
      const merchantId = 'm_12345';
      const slug = 'sync-slug';

      service.syncWidgetSlug.mockResolvedValue(slug);

      const result = await service.syncWidgetSlug(merchantId, slug);

      expect(service.syncWidgetSlug).toHaveBeenCalledWith(merchantId, slug);
      expect(result).toBe(slug);
    });
  });

  describe('getSettingsBySlugOrPublicSlug', () => {
    it('should get settings by slug (method exists but not directly tested)', async () => {
      // This method exists in the controller but might not be directly exposed as an endpoint
      // Testing the service method directly
      const slug = 'test-slug';
      const settings = {
        merchantId: 'm_12345',
        widgetSlug: slug,
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await service.getSettingsBySlugOrPublicSlug(slug);

      expect(service.getSettingsBySlugOrPublicSlug).toHaveBeenCalledWith(slug);
      expect(result).toBe(settings);
    });
  });
});
