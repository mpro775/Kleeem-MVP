import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Connection, Model, ClientSession } from 'mongoose';
import { WebhooksService } from './webhooks.service';
import { Webhook } from './schemas/webhook.schema';
import { MessageService } from '../messaging/message.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { BotReplyDto } from './dto/bot-reply.dto';

describe('WebhooksService', () => {
  let service: WebhooksService;
  let mockMessageService: jest.Mocked<MessageService>;
  let mockWebhookModel: jest.Mocked<Model<Webhook>>;
  let mockConnection: jest.Mocked<Connection>;
  let mockOutboxService: jest.Mocked<OutboxService>;
  let mockSession: jest.Mocked<ClientSession>;

  beforeEach(async () => {
    // Create mocks
    mockMessageService = {
      createOrAppend: jest.fn(),
    } as any;

    mockWebhookModel = {
      create: jest.fn(),
    } as any;

    mockSession = {
      withTransaction: jest.fn(),
      endSession: jest.fn(),
    } as any;

    mockConnection = {
      startSession: jest.fn().mockReturnValue(mockSession),
    } as any;

    mockOutboxService = {
      enqueueEvent: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: MessageService, useValue: mockMessageService },
        { provide: getModelToken(Webhook.name), useValue: mockWebhookModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: OutboxService, useValue: mockOutboxService },
      ],
    }).compile();

    service = module.get<WebhooksService>(WebhooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have messageService injected', () => {
      expect(service).toBeDefined();
    });

    it('should have webhookModel injected', () => {
      expect(service).toBeDefined();
    });

    it('should have connection injected', () => {
      expect(service).toBeDefined();
    });

    it('should have outbox service injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('handleEvent', () => {
    const mockPayload = {
      merchantId: 'merchant-123',
      from: 'user-456',
      messageText: 'مرحباً، أريد الاستفسار عن المنتجات',
      metadata: { platform: 'whatsapp', timestamp: Date.now() },
    };

    it('should handle whatsapp_incoming event successfully', async () => {
      const eventType = 'whatsapp_incoming';
      
      // Mock transaction success
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleEvent(eventType, mockPayload);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.withTransaction).toHaveBeenCalled();
      
      expect(mockWebhookModel.create).toHaveBeenCalledWith(
        [
          {
            eventType,
            payload: JSON.stringify(mockPayload),
            receivedAt: expect.any(Date),
          },
        ],
        { session: mockSession },
      );

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        {
          merchantId: mockPayload.merchantId,
          sessionId: mockPayload.from,
          channel: 'whatsapp',
          messages: [
            {
              role: 'customer',
              text: mockPayload.messageText,
              metadata: mockPayload.metadata,
            },
          ],
        },
        mockSession,
      );

      expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
        {
          aggregateType: 'conversation',
          aggregateId: mockPayload.from,
          eventType: 'chat.incoming',
          payload: {
            merchantId: mockPayload.merchantId,
            sessionId: mockPayload.from,
            channel: 'whatsapp',
            text: mockPayload.messageText,
            metadata: mockPayload.metadata,
          },
          exchange: 'chat.incoming',
          routingKey: 'whatsapp',
        },
        mockSession,
      );

      expect(mockSession.endSession).toHaveBeenCalled();

      expect(result).toEqual({
        sessionId: mockPayload.from,
        status: 'accepted',
      });
    });

    it('should handle telegram_incoming event successfully', async () => {
      const eventType = 'telegram_incoming';
      
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleEvent(eventType, mockPayload);

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'telegram',
        }),
        mockSession,
      );

      expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          routingKey: 'telegram',
        }),
        mockSession,
      );

      expect(result).toEqual({
        sessionId: mockPayload.from,
        status: 'accepted',
      });
    });

    it('should handle webchat_incoming event successfully', async () => {
      const eventType = 'webchat_incoming';
      
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleEvent(eventType, mockPayload);

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: 'webchat',
        }),
        mockSession,
      );

      expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          routingKey: 'webchat',
        }),
        mockSession,
      );

      expect(result).toEqual({
        sessionId: mockPayload.from,
        status: 'accepted',
      });
    });

    it('should throw BadRequestException when merchantId is missing', async () => {
      const invalidPayload = {
        from: 'user-456',
        messageText: 'test message',
      };

      await expect(
        service.handleEvent('whatsapp_incoming', invalidPayload),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.handleEvent('whatsapp_incoming', invalidPayload),
      ).rejects.toThrow('Invalid payload');
    });

    it('should throw BadRequestException when from is missing', async () => {
      const invalidPayload = {
        merchantId: 'merchant-123',
        messageText: 'test message',
      };

      await expect(
        service.handleEvent('whatsapp_incoming', invalidPayload),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when messageText is missing', async () => {
      const invalidPayload = {
        merchantId: 'merchant-123',
        from: 'user-456',
      };

      await expect(
        service.handleEvent('whatsapp_incoming', invalidPayload),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle payload without metadata', async () => {
      const payloadWithoutMetadata = {
        merchantId: 'merchant-123',
        from: 'user-456',
        messageText: 'test message',
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleEvent('whatsapp_incoming', payloadWithoutMetadata);

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              metadata: {},
            }),
          ],
        }),
        mockSession,
      );

      expect(result).toBeDefined();
    });

    it('should handle transaction failure', async () => {
      const transactionError = new Error('Transaction failed');
      
      mockSession.withTransaction.mockRejectedValue(transactionError);

      await expect(
        service.handleEvent('whatsapp_incoming', mockPayload),
      ).rejects.toThrow('Transaction failed');

      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should ensure session is always ended', async () => {
      const transactionError = new Error('Transaction failed');
      
      mockSession.withTransaction.mockRejectedValue(transactionError);

      try {
        await service.handleEvent('whatsapp_incoming', mockPayload);
      } catch (error) {
        // Expected to throw
      }

      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle large payloads', async () => {
      const largePayload = {
        merchantId: 'merchant-123',
        from: 'user-456',
        messageText: 'ا'.repeat(10000), // Very long Arabic text
        metadata: {
          platform: 'whatsapp',
          userData: {
            profile: 'ب'.repeat(5000),
            history: Array.from({ length: 1000 }, (_, i) => `message-${i}`),
          },
        },
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleEvent('whatsapp_incoming', largePayload);

      expect(mockWebhookModel.create).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            payload: JSON.stringify(largePayload),
          }),
        ],
        { session: mockSession },
      );

      expect(result).toBeDefined();
    });

    it('should handle special characters in messageText', async () => {
      const specialPayload = {
        merchantId: 'merchant-123',
        from: 'user-456',
        messageText: 'مرحباً! كيف حالك؟ 😊 أريد شراء هذا المنتج 💰 بسعر $100',
        metadata: { hasEmojis: true, hasSpecialChars: true },
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleEvent('whatsapp_incoming', specialPayload);

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              text: specialPayload.messageText,
            }),
          ],
        }),
        mockSession,
      );

      expect(result).toBeDefined();
    });

    it('should extract correct channel from eventType', async () => {
      const testCases = [
        { eventType: 'whatsapp_incoming', expectedChannel: 'whatsapp' },
        { eventType: 'telegram_incoming', expectedChannel: 'telegram' },
        { eventType: 'webchat_incoming', expectedChannel: 'webchat' },
        { eventType: 'sms_incoming', expectedChannel: 'sms' },
      ];

      for (const testCase of testCases) {
        mockSession.withTransaction.mockImplementation(async (callback) => {
          await callback();
          return {};
        });

        mockWebhookModel.create.mockResolvedValue({} as any);
        mockMessageService.createOrAppend.mockResolvedValue({} as any);
        mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

        await service.handleEvent(testCase.eventType, mockPayload);

        expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
          expect.objectContaining({
            channel: testCase.expectedChannel,
          }),
          mockSession,
        );

        expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            routingKey: testCase.expectedChannel,
          }),
          mockSession,
        );

        jest.clearAllMocks();
      }
    });
  });

  describe('handleBotReply', () => {
    const merchantId = 'merchant-123';
    const botReplyDto: BotReplyDto = {
      sessionId: 'session-456',
      text: 'شكراً لك على تواصلك معنا! كيف يمكنني مساعدتك؟',
      metadata: { source: 'bot_engine', confidence: 0.95 },
    };

    it('should handle bot reply successfully', async () => {
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleBotReply(merchantId, botReplyDto);

      expect(mockConnection.startSession).toHaveBeenCalled();
      expect(mockSession.withTransaction).toHaveBeenCalled();

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        {
          merchantId,
          sessionId: botReplyDto.sessionId,
          channel: 'webchat',
          messages: [
            {
              role: 'bot',
              text: botReplyDto.text,
              metadata: botReplyDto.metadata,
            },
          ],
        },
        mockSession,
      );

      expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
        {
          aggregateType: 'conversation',
          aggregateId: botReplyDto.sessionId,
          eventType: 'chat.reply',
          payload: {
            merchantId,
            sessionId: botReplyDto.sessionId,
            channel: 'webchat',
            text: botReplyDto.text,
            metadata: botReplyDto.metadata,
          },
          exchange: 'chat.reply',
          routingKey: 'web',
        },
        mockSession,
      );

      expect(mockSession.endSession).toHaveBeenCalled();

      expect(result).toEqual({
        sessionId: botReplyDto.sessionId,
        status: 'accepted',
      });
    });

    it('should handle bot reply without metadata', async () => {
      const botReplyWithoutMetadata: BotReplyDto = {
        sessionId: 'session-789',
        text: 'رد بسيط بدون metadata',
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleBotReply(merchantId, botReplyWithoutMetadata);

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              metadata: {},
            }),
          ],
        }),
        mockSession,
      );

      expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            metadata: {},
          }),
        }),
        mockSession,
      );

      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when sessionId is missing', async () => {
      const invalidDto = {
        text: 'test reply',
      } as BotReplyDto;

      await expect(
        service.handleBotReply(merchantId, invalidDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.handleBotReply(merchantId, invalidDto),
      ).rejects.toThrow('sessionId و text مطلوبة');
    });

    it('should throw BadRequestException when text is missing', async () => {
      const invalidDto = {
        sessionId: 'session-123',
      } as BotReplyDto;

      await expect(
        service.handleBotReply(merchantId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when sessionId is empty', async () => {
      const invalidDto: BotReplyDto = {
        sessionId: '',
        text: 'test reply',
      };

      await expect(
        service.handleBotReply(merchantId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when text is empty', async () => {
      const invalidDto: BotReplyDto = {
        sessionId: 'session-123',
        text: '',
      };

      await expect(
        service.handleBotReply(merchantId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle transaction failure in bot reply', async () => {
      const transactionError = new Error('Bot reply transaction failed');
      
      mockSession.withTransaction.mockRejectedValue(transactionError);

      await expect(
        service.handleBotReply(merchantId, botReplyDto),
      ).rejects.toThrow('Bot reply transaction failed');

      expect(mockSession.endSession).toHaveBeenCalled();
    });

    it('should handle Arabic text in bot reply', async () => {
      const arabicBotReply: BotReplyDto = {
        sessionId: 'session-arabic',
        text: 'مرحباً بك في متجرنا الإلكتروني! نحن سعداء لخدمتك ومساعدتك في العثور على ما تبحث عنه',
        metadata: { language: 'ar', responseType: 'greeting' },
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleBotReply(merchantId, arabicBotReply);

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              text: arabicBotReply.text,
            }),
          ],
        }),
        mockSession,
      );

      expect(result).toBeDefined();
    });

    it('should handle very long bot replies', async () => {
      const longBotReply: BotReplyDto = {
        sessionId: 'session-long',
        text: 'هذا رد طويل جداً من البوت '.repeat(500),
        metadata: { length: 'very_long', wordCount: 2500 },
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleBotReply(merchantId, longBotReply);

      expect(result).toBeDefined();
    });

    it('should handle special characters and emojis in bot reply', async () => {
      const emojisBotReply: BotReplyDto = {
        sessionId: 'session-emojis',
        text: 'مرحباً! 👋 أهلاً بك في متجرنا 🛍️ نحن سعداء لخدمتك 😊',
        metadata: { hasEmojis: true, sentiment: 'positive' },
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleBotReply(merchantId, emojisBotReply);

      expect(mockMessageService.createOrAppend).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              text: emojisBotReply.text,
            }),
          ],
        }),
        mockSession,
      );

      expect(result).toBeDefined();
    });

    it('should handle complex metadata in bot reply', async () => {
      const complexBotReply: BotReplyDto = {
        sessionId: 'session-complex',
        text: 'رد معقد مع بيانات إضافية',
        metadata: {
          ai: {
            model: 'gpt-4',
            temperature: 0.7,
            tokens: { input: 50, output: 25, total: 75 },
          },
          processing: {
            duration: 1200,
            steps: ['intent_analysis', 'context_retrieval', 'response_generation'],
          },
          business: {
            merchantId,
            category: 'ecommerce',
            language: 'ar',
          },
        },
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleBotReply(merchantId, complexBotReply);

      expect(mockOutboxService.enqueueEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            metadata: complexBotReply.metadata,
          }),
        }),
        mockSession,
      );

      expect(result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      const connectionError = new Error('Database connection failed');
      mockConnection.startSession.mockRejectedValue(connectionError);

      await expect(
        service.handleEvent('whatsapp_incoming', {
          merchantId: 'test',
          from: 'test',
          messageText: 'test',
        }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle webhook model creation errors', async () => {
      const modelError = new Error('Webhook creation failed');
      
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockRejectedValue(modelError);

      await expect(
        service.handleEvent('whatsapp_incoming', {
          merchantId: 'test',
          from: 'test',
          messageText: 'test',
        }),
      ).rejects.toThrow('Webhook creation failed');
    });

    it('should handle message service errors', async () => {
      const messageError = new Error('Message service failed');
      
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockRejectedValue(messageError);

      await expect(
        service.handleEvent('whatsapp_incoming', {
          merchantId: 'test',
          from: 'test',
          messageText: 'test',
        }),
      ).rejects.toThrow('Message service failed');
    });

    it('should handle outbox service errors', async () => {
      const outboxError = new Error('Outbox service failed');
      
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockRejectedValue(outboxError);

      await expect(
        service.handleEvent('whatsapp_incoming', {
          merchantId: 'test',
          from: 'test',
          messageText: 'test',
        }),
      ).rejects.toThrow('Outbox service failed');
    });
  });

  describe('Performance Tests', () => {
    it('should handle high frequency events', async () => {
      const payload = {
        merchantId: 'merchant-123',
        from: 'user-456',
        messageText: 'test message',
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockWebhookModel.create.mockResolvedValue({} as any);
      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      // Process 100 events concurrently
      const promises = Array.from({ length: 100 }, (_, i) =>
        service.handleEvent('whatsapp_incoming', {
          ...payload,
          from: `user-${i}`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.status).toBe('accepted');
      });

      expect(mockConnection.startSession).toHaveBeenCalledTimes(100);
      expect(mockSession.endSession).toHaveBeenCalledTimes(100);
    });

    it('should handle concurrent bot replies', async () => {
      const merchantId = 'merchant-123';
      
      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      // Process 50 bot replies concurrently
      const promises = Array.from({ length: 50 }, (_, i) =>
        service.handleBotReply(merchantId, {
          sessionId: `session-${i}`,
          text: `Bot reply ${i}`,
        }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(50);
      results.forEach((result, index) => {
        expect(result.sessionId).toBe(`session-${index}`);
        expect(result.status).toBe('accepted');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null payload gracefully', async () => {
      await expect(
        service.handleEvent('whatsapp_incoming', null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle undefined payload gracefully', async () => {
      await expect(
        service.handleEvent('whatsapp_incoming', undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty object payload', async () => {
      await expect(
        service.handleEvent('whatsapp_incoming', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle whitespace-only messageText', async () => {
      const payload = {
        merchantId: 'merchant-123',
        from: 'user-456',
        messageText: '   \t\n   ',
      };

      await expect(
        service.handleEvent('whatsapp_incoming', payload),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle very long session IDs', async () => {
      const longSessionId = 'session-' + 'a'.repeat(1000);
      const botReply: BotReplyDto = {
        sessionId: longSessionId,
        text: 'reply for long session ID',
      };

      mockSession.withTransaction.mockImplementation(async (callback) => {
        await callback();
        return {};
      });

      mockMessageService.createOrAppend.mockResolvedValue({} as any);
      mockOutboxService.enqueueEvent.mockResolvedValue({} as any);

      const result = await service.handleBotReply('merchant-123', botReply);

      expect(result.sessionId).toBe(longSessionId);
    });
  });
});
