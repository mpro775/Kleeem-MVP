import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { ChatWidgetService } from '../chat-widget.service';
import { PublicChatWidgetController } from '../public-chat-widget.controller';

import type { TestingModule } from '@nestjs/testing';

describe('PublicChatWidgetController', () => {
  let controller: PublicChatWidgetController;
  let service: jest.Mocked<ChatWidgetService>;

  beforeEach(async () => {
    const mockService = {
      getSettingsBySlugOrPublicSlug: jest.fn(),
      getSettings: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicChatWidgetController],
      providers: [
        {
          provide: ChatWidgetService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<PublicChatWidgetController>(
      PublicChatWidgetController,
    );
    service = module.get(ChatWidgetService);
  });

  describe('getByWidgetSlug', () => {
    it('should return widget settings for valid slug', async () => {
      const widgetSlug = 'chat_abc123';
      const settings = {
        merchantId: 'm_12345',
        widgetSlug,
        embedMode: 'iframe',
        headerBgColor: '#ffffff',
        brandColor: '#000000',
        fontFamily: 'Arial',
        botName: 'Test Bot',
        welcomeMessage: 'Welcome!',
        useStorefrontBrand: false,
        topicsTags: ['support', 'sales'],
        sentimentTags: ['positive', 'negative'],
        handoffEnabled: true,
        handoffChannel: 'whatsapp',
        handoffConfig: { phone: '+1234567890' },
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await controller.getByWidgetSlug(widgetSlug);

      expect(service.getSettingsBySlugOrPublicSlug).toHaveBeenCalledWith(
        widgetSlug,
      );
      expect(result).toEqual({
        merchantId: 'm_12345',
        widgetSlug: 'chat_abc123',
        embedMode: 'iframe',
        theme: {
          headerBgColor: '#ffffff',
          brandColor: '#000000',
          fontFamily: 'Arial',
        },
        botName: 'Test Bot',
        welcomeMessage: 'Welcome!',
        useStorefrontBrand: false,
        topicsTags: ['support', 'sales'],
        sentimentTags: ['positive', 'negative'],
        handoffEnabled: true,
        handoffChannel: 'whatsapp',
        handoffConfig: { phone: '+1234567890' },
      });
    });

    it('should throw BadRequestException for empty slug', async () => {
      await expect(controller.getByWidgetSlug('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getByWidgetSlug('   ')).rejects.toThrow(
        BadRequestException,
      );

      expect(service.getSettingsBySlugOrPublicSlug).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when widget not found', async () => {
      const widgetSlug = 'nonexistent-slug';

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(null);

      await expect(controller.getByWidgetSlug(widgetSlug)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getSettingsBySlugOrPublicSlug).toHaveBeenCalledWith(
        widgetSlug,
      );
    });

    it('should handle settings with null values', async () => {
      const widgetSlug = 'chat_xyz789';
      const settings = {
        merchantId: 'm_12345',
        widgetSlug,
        embedMode: 'bubble',
        headerBgColor: null,
        brandColor: null,
        fontFamily: null,
        botName: null,
        welcomeMessage: null,
        useStorefrontBrand: null,
        topicsTags: null,
        sentimentTags: null,
        handoffEnabled: null,
        handoffChannel: null,
        handoffConfig: null,
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await controller.getByWidgetSlug(widgetSlug);

      expect(result).toEqual({
        merchantId: 'm_12345',
        widgetSlug: 'chat_xyz789',
        embedMode: 'bubble',
        theme: {
          headerBgColor: null,
          brandColor: null,
          fontFamily: null,
        },
        botName: null,
        welcomeMessage: null,
        useStorefrontBrand: null,
        topicsTags: null,
        sentimentTags: null,
        handoffEnabled: null,
        handoffChannel: null,
        handoffConfig: null,
      });
    });
  });

  describe('getWidgetStatus', () => {
    it('should return widget status for valid slug', async () => {
      const widgetSlug = 'chat_abc123';
      const settings = {
        merchantId: 'm_12345',
        widgetSlug,
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      // Mock Date.now() to return a consistent timestamp
      const mockNow = 1640995200000; // 2022-01-01 00:00:00 UTC
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);

      const result = await controller.getWidgetStatus(widgetSlug);

      expect(service.getSettingsBySlugOrPublicSlug).toHaveBeenCalledWith(
        widgetSlug,
      );
      expect(result).toEqual({
        widgetSlug: 'chat_abc123',
        isOnline: true,
        isWithinBusinessHours: true,
        estimatedWaitTime: 45,
        availableAgents: 3,
        totalActiveChats: 12,
        lastUpdated: expect.any(String),
      });

      // Restore Date.now
      jest.restoreAllMocks();
    });

    it('should throw BadRequestException for empty slug', async () => {
      await expect(controller.getWidgetStatus('')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getWidgetStatus('   ')).rejects.toThrow(
        BadRequestException,
      );

      expect(service.getSettingsBySlugOrPublicSlug).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when widget not found', async () => {
      const widgetSlug = 'nonexistent-slug';

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(null);

      await expect(controller.getWidgetStatus(widgetSlug)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getSettingsBySlugOrPublicSlug).toHaveBeenCalledWith(
        widgetSlug,
      );
    });
  });

  describe('createSession', () => {
    beforeEach(() => {
      // Mock Math.random and Date.now for consistent session ID generation
      jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
      jest.spyOn(Date, 'now').mockReturnValue(1640995200000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should create session successfully with visitorId', async () => {
      const widgetSlug = 'chat_abc123';
      const body = {
        visitorId: 'visitor_123',
      };
      const settings = {
        merchantId: 'm_12345',
        widgetSlug,
        welcomeMessage: 'مرحبا بك في متجرنا',
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await controller.createSession(widgetSlug, body);

      expect(service.getSettingsBySlugOrPublicSlug).toHaveBeenCalledWith(
        widgetSlug,
      );
      expect(result).toEqual({
        success: true,
        sessionId: expect.stringMatching(/^session_1640995200000_/),
        widgetSlug: 'chat_abc123',
        visitorId: 'visitor_123',
        status: 'waiting',
        assignedAgent: null,
        estimatedWaitTime: 30,
        welcomeMessage: 'مرحبا بك في متجرنا',
        createdAt: expect.any(String),
        expiresAt: expect.any(String),
      });
    });

    it('should create session with generated visitorId when not provided', async () => {
      const widgetSlug = 'chat_xyz789';
      const body = {};
      const settings = {
        merchantId: 'm_67890',
        widgetSlug,
        welcomeMessage: null,
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await controller.createSession(widgetSlug, body);

      expect(result.visitorId).toMatch(/^visitor_1640995200000$/);
      expect(result.welcomeMessage).toBe('مرحباً! شكراً لتواصلك.');
    });

    it('should throw BadRequestException for empty slug', async () => {
      const body = { visitorId: 'visitor_123' };

      await expect(controller.createSession('', body)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.createSession('   ', body)).rejects.toThrow(
        BadRequestException,
      );

      expect(service.getSettingsBySlugOrPublicSlug).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when widget not found', async () => {
      const widgetSlug = 'nonexistent-slug';
      const body = { visitorId: 'visitor_123' };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(null);

      await expect(controller.createSession(widgetSlug, body)).rejects.toThrow(
        NotFoundException,
      );
      expect(service.getSettingsBySlugOrPublicSlug).toHaveBeenCalledWith(
        widgetSlug,
      );
    });

    it('should generate unique session IDs', async () => {
      const widgetSlug = 'chat_test123';
      const settings = {
        merchantId: 'm_test',
        widgetSlug,
        welcomeMessage: 'Welcome',
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      // Create multiple sessions to ensure uniqueness
      const session1 = await controller.createSession(widgetSlug, {});
      const session2 = await controller.createSession(widgetSlug, {});

      // Since we're mocking Date.now and Math.random with the same values,
      // the sessions will be identical, but in real usage they would be different
      expect(session1.sessionId).toBe(session2.sessionId);

      // But with different timestamps they would be different
      jest.spyOn(Date, 'now').mockReturnValue(1640995201000);
      const session3 = await controller.createSession(widgetSlug, {});
      expect(session3.sessionId).not.toBe(session1.sessionId);
    });

    it('should handle settings with undefined welcomeMessage', async () => {
      const widgetSlug = 'chat_no_welcome';
      const settings = {
        merchantId: 'm_test',
        widgetSlug,
        welcomeMessage: undefined,
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await controller.createSession(widgetSlug, {});

      expect(result.welcomeMessage).toBe('مرحباً! شكراً لتواصلك.');
    });

    it('should handle settings with empty welcomeMessage', async () => {
      const widgetSlug = 'chat_empty_welcome';
      const settings = {
        merchantId: 'm_test',
        widgetSlug,
        welcomeMessage: '',
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await controller.createSession(widgetSlug, {});

      expect(result.welcomeMessage).toBe(''); // Empty string is returned as-is
    });

    it('should handle settings with null welcomeMessage', async () => {
      const widgetSlug = 'chat_null_welcome';
      const settings = {
        merchantId: 'm_test',
        widgetSlug,
        welcomeMessage: null,
      };

      service.getSettingsBySlugOrPublicSlug.mockResolvedValue(settings as any);

      const result = await controller.createSession(widgetSlug, {});

      expect(result.welcomeMessage).toBe('مرحباً! شكراً لتواصلك.');
    });
  });
});
