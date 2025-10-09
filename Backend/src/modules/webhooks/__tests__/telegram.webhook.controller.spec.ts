import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';

import { Channel } from '../../channels/schemas/channel.schema';
import { TelegramWebhookController } from '../telegram.webhook.controller';
import { WebhooksController } from '../webhooks.controller';

import type { TelegramUpdateDto } from '../dto/telegram-update.dto';
import type { TestingModule } from '@nestjs/testing';

describe('TelegramWebhookController', () => {
  let controller: TelegramWebhookController;
  let _channelModel: jest.Mocked<any>;
  let webhooksController: jest.Mocked<WebhooksController>;
  let cacheManager: jest.Mocked<any>;

  beforeEach(async () => {
    const mockChannelModel = {
      findById: jest.fn(),
    };
    const mockWebhooksController = {
      handleIncoming: jest.fn(),
    };
    const mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelegramWebhookController],
      providers: [
        {
          provide: getModelToken(Channel.name),
          useValue: mockChannelModel,
        },
        {
          provide: WebhooksController,
          useValue: mockWebhooksController,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    controller = module.get<TelegramWebhookController>(
      TelegramWebhookController,
    );
    _channelModel = module.get(getModelToken(Channel.name));
    webhooksController = module.get(WebhooksController);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('incoming', () => {
    it('should handle incoming telegram update successfully', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId, botTokenEnc: 'encrypted_token' },
      } as any;
      const body = {
        update_id: 123456,
        message: {
          message_id: 789,
          from: { id: 12345, username: 'testuser' },
          chat: { id: 67890, type: 'private' },
          text: 'Hello from Telegram',
          date: Math.floor(Date.now() / 1000),
        },
      };

      // Mock idempotency check - update not seen before
      const mockPreventDuplicates = jest.fn().mockResolvedValue(false);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
        idemKey: jest.fn(),
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incoming(channelId, req, body);

      expect(mockPreventDuplicates).toHaveBeenCalledWith(
        cacheManager,
        expect.objectContaining({
          provider: 'telegram',
          channelId: 'channel123',
          merchantId: 'merchant123',
          messageId: 123456,
        }),
      );
      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        body,
        req,
      );
    });

    it('should handle incoming telegram update without update_id', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = {
        message: {
          message_id: 789,
          text: 'Hello without update_id',
        },
      };

      // Should not check idempotency when update_id is missing
      const mockPreventDuplicates = jest.fn();
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
        idemKey: jest.fn(),
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incoming(channelId, req, body as TelegramUpdateDto);

      expect(mockPreventDuplicates).not.toHaveBeenCalled();
      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        body,
        req,
      );
    });

    it('should skip duplicate updates', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = {
        update_id: 123456,
        message: {
          message_id: 789,
          text: 'Duplicate message',
        },
      };

      // Mock idempotency check - update already seen
      const mockPreventDuplicates = jest.fn().mockResolvedValue(true);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
        idemKey: jest.fn(),
      }));

      await controller.incoming(channelId, req, body as TelegramUpdateDto);

      expect(mockPreventDuplicates).toHaveBeenCalledWith(
        cacheManager,
        expect.objectContaining({
          provider: 'telegram',
          channelId: 'channel123',
          merchantId: 'merchant123',
          messageId: 123456,
        }),
      );
      expect(webhooksController.handleIncoming).not.toHaveBeenCalled();
    });

    it('should handle update_id equal to zero', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = {
        update_id: 0,
        message: {
          message_id: 789,
          text: 'Message with update_id 0',
        },
      };

      // Should check idempotency even for update_id 0
      const mockPreventDuplicates = jest.fn().mockResolvedValue(false);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
        idemKey: jest.fn(),
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incoming(channelId, req, body as TelegramUpdateDto);

      expect(mockPreventDuplicates).toHaveBeenCalledWith(
        cacheManager,
        expect.objectContaining({
          provider: 'telegram',
          channelId: 'channel123',
          merchantId: 'merchant123',
          messageId: 0,
        }),
      );
      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        body,
        req,
      );
    });

    it('should throw NotFoundException when merchantId is not resolved', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: '',
        channel: { id: channelId },
      } as any;
      const body = {
        update_id: 123456,
        message: { text: 'Hello' },
      };

      await expect(
        controller.incoming(channelId, req, body as TelegramUpdateDto),
      ).rejects.toThrow('Merchant not resolved');
    });

    it('should handle various telegram update types', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;

      const testCases = [
        {
          name: 'text message',
          body: {
            update_id: 1,
            message: { message_id: 100, text: 'Hello' },
          },
        },
        {
          name: 'callback query',
          body: {
            update_id: 2,
            callback_query: { id: 'cb123', data: 'action' },
          },
        },
        {
          name: 'inline query',
          body: {
            update_id: 3,
            inline_query: { id: 'iq123', query: 'search' },
          },
        },
        {
          name: 'photo message',
          body: {
            update_id: 4,
            message: {
              message_id: 200,
              photo: [{ file_id: 'photo123' }],
              caption: 'Photo caption',
            },
          },
        },
        {
          name: 'document message',
          body: {
            update_id: 5,
            message: {
              message_id: 300,
              document: { file_id: 'doc123', file_name: 'document.pdf' },
            },
          },
        },
      ];

      const mockPreventDuplicates = jest.fn().mockResolvedValue(false);
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
        idemKey: jest.fn(),
      }));

      for (const testCase of testCases) {
        webhooksController.handleIncoming.mockResolvedValue({ ok: true });

        await controller.incoming(
          channelId,
          req,
          testCase.body as unknown as TelegramUpdateDto,
        );

        expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
          'merchant123',
          testCase.body,
          req,
        );
      }

      // Should have called preventDuplicates for each test case
      expect(mockPreventDuplicates).toHaveBeenCalledTimes(testCases.length);
    });

    it('should handle null update_id', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = {
        update_id: null,
        message: { text: 'Message with null update_id' },
      };

      // Should not check idempotency when update_id is null
      const mockPreventDuplicates = jest.fn();
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
        idemKey: jest.fn(),
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incoming(
        channelId,
        req,
        body as unknown as TelegramUpdateDto,
      );

      expect(mockPreventDuplicates).not.toHaveBeenCalled();
      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        body,
        req,
      );
    });

    it('should handle undefined update_id', async () => {
      const channelId = 'channel123';
      const req = {
        merchantId: 'merchant123',
        channel: { id: channelId },
      } as any;
      const body = {
        message: { text: 'Message without update_id field' },
      };

      // Should not check idempotency when update_id is undefined
      const mockPreventDuplicates = jest.fn();
      jest.doMock('../../../common/utils/idempotency.util', () => ({
        preventDuplicates: mockPreventDuplicates,
        idemKey: jest.fn(),
      }));

      webhooksController.handleIncoming.mockResolvedValue({ ok: true });

      await controller.incoming(channelId, req, body as TelegramUpdateDto);

      expect(mockPreventDuplicates).not.toHaveBeenCalled();
      expect(webhooksController.handleIncoming).toHaveBeenCalledWith(
        'merchant123',
        body,
        req,
      );
    });
  });
});
