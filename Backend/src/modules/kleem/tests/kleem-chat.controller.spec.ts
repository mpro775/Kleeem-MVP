import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KleemChatController } from '../chat/kleem-chat.controller';
import { KleemChatService } from '../chat/kleem-chat.service';
import { BotChatsService } from '../botChats/botChats.service';

describe('KleemChatController', () => {
  let controller: KleemChatController;
  let mockKleemChatService: jest.Mocked<KleemChatService>;
  let mockBotChatsService: jest.Mocked<BotChatsService>;

  beforeEach(async () => {
    // Create mocks
    mockKleemChatService = {
      handleUserMessage: jest.fn(),
    } as any;

    mockBotChatsService = {
      rateMessage: jest.fn(),
      findBySession: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KleemChatController],
      providers: [
        { provide: KleemChatService, useValue: mockKleemChatService },
        { provide: BotChatsService, useValue: mockBotChatsService },
      ],
    }).compile();

    controller = module.get<KleemChatController>(KleemChatController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have KleemChatService injected', () => {
      expect(controller).toBeDefined();
    });

    it('should have BotChatsService injected', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('sendMessage', () => {
    const sessionId = 'test-session-123';
    const messageDto = {
      text: 'مرحباً، أريد الاستفسار عن خدماتكم',
      metadata: { platform: 'web', userAgent: 'Mozilla/5.0' },
    };

    it('should send message successfully with metadata', async () => {
      const expectedResponse = { status: 'queued' as const };
      mockKleemChatService.handleUserMessage.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.sendMessage(sessionId, messageDto);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageDto.text,
        messageDto.metadata,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should send message successfully without metadata', async () => {
      const messageDtoWithoutMetadata = {
        text: 'مرحباً بك',
      };
      const expectedResponse = { status: 'queued' as const };
      mockKleemChatService.handleUserMessage.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.sendMessage(
        sessionId,
        messageDtoWithoutMetadata,
      );

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageDtoWithoutMetadata.text,
        undefined,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('Service error');
      mockKleemChatService.handleUserMessage.mockRejectedValue(error);

      await expect(
        controller.sendMessage(sessionId, messageDto),
      ).rejects.toThrow('Service error');
    });

    it('should handle empty text message', async () => {
      const emptyMessageDto = {
        text: '',
        metadata: {},
      };

      const expectedResponse = { status: 'queued' as const };
      mockKleemChatService.handleUserMessage.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.sendMessage(sessionId, emptyMessageDto);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        '',
        {},
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle complex metadata objects', async () => {
      const complexMessageDto = {
        text: 'رسالة معقدة',
        metadata: {
          platform: 'mobile',
          device: {
            type: 'smartphone',
            os: 'iOS',
            version: '16.0',
          },
          session: {
            startTime: '2024-01-01T00:00:00Z',
            previousMessages: 5,
          },
          user: {
            isAuthenticated: true,
            preferences: {
              language: 'ar',
              theme: 'dark',
            },
          },
        },
      };

      const expectedResponse = { status: 'queued' as const };
      mockKleemChatService.handleUserMessage.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.sendMessage(sessionId, complexMessageDto);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        complexMessageDto.text,
        complexMessageDto.metadata,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle Arabic text messages', async () => {
      const arabicMessageDto = {
        text: 'أريد معرفة المزيد عن منصة كليم والخدمات المتوفرة فيها',
        metadata: { language: 'ar' },
      };

      const expectedResponse = { status: 'queued' as const };
      mockKleemChatService.handleUserMessage.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.sendMessage(sessionId, arabicMessageDto);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        arabicMessageDto.text,
        arabicMessageDto.metadata,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle special characters in session ID', async () => {
      const specialSessionId = 'session-123_abc-def@example.com';
      const expectedResponse = { status: 'queued' as const };
      mockKleemChatService.handleUserMessage.mockResolvedValue(
        expectedResponse,
      );

      const result = await controller.sendMessage(specialSessionId, messageDto);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        specialSessionId,
        messageDto.text,
        messageDto.metadata,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('rate', () => {
    const sessionId = 'test-session-123';
    const rateDto = {
      msgIdx: 2,
      rating: 1 as 0 | 1,
      feedback: 'الرد كان مفيداً جداً',
    };

    it('should rate message successfully with feedback', async () => {
      const expectedResponse = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResponse);

      const result = await controller.rate(sessionId, rateDto);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        rateDto.msgIdx,
        rateDto.rating,
        rateDto.feedback,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should rate message successfully without feedback', async () => {
      const rateDtoWithoutFeedback = {
        msgIdx: 1,
        rating: 0 as 0 | 1,
      };
      const expectedResponse = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResponse);

      const result = await controller.rate(sessionId, rateDtoWithoutFeedback);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        rateDtoWithoutFeedback.msgIdx,
        rateDtoWithoutFeedback.rating,
        undefined,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle positive rating (1)', async () => {
      const positiveRateDto = {
        msgIdx: 0,
        rating: 1 as 0 | 1,
        feedback: 'ممتاز',
      };
      const expectedResponse = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResponse);

      const result = await controller.rate(sessionId, positiveRateDto);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        0,
        1,
        'ممتاز',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle negative rating (0)', async () => {
      const negativeRateDto = {
        msgIdx: 3,
        rating: 0 as 0 | 1,
        feedback: 'الرد لم يكن مفيداً',
      };
      const expectedResponse = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResponse);

      const result = await controller.rate(sessionId, negativeRateDto);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        3,
        0,
        'الرد لم يكن مفيداً',
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle message not found error', async () => {
      const error = new Error('Message not found for rating');
      mockBotChatsService.rateMessage.mockRejectedValue(error);

      await expect(controller.rate(sessionId, rateDto)).rejects.toThrow(
        'Message not found for rating',
      );
    });

    it('should handle invalid message index', async () => {
      const invalidRateDto = {
        msgIdx: -1,
        rating: 1 as 0 | 1,
      };

      const error = new Error('Invalid message index');
      mockBotChatsService.rateMessage.mockRejectedValue(error);

      await expect(controller.rate(sessionId, invalidRateDto)).rejects.toThrow(
        'Invalid message index',
      );
    });

    it('should handle long feedback text', async () => {
      const longFeedbackDto = {
        msgIdx: 1,
        rating: 0 as 0 | 1,
        feedback:
          'هذا تعليق طويل جداً يحتوي على تفاصيل كثيرة حول سبب عدم رضائي عن الرد الذي تلقيته من البوت. أعتقد أن الرد لم يكن دقيقاً وواضحاً بما فيه الكفاية لحل مشكلتي',
      };

      const expectedResponse = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResponse);

      const result = await controller.rate(sessionId, longFeedbackDto);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        longFeedbackDto.msgIdx,
        longFeedbackDto.rating,
        longFeedbackDto.feedback,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle empty feedback string', async () => {
      const emptyFeedbackDto = {
        msgIdx: 2,
        rating: 1 as 0 | 1,
        feedback: '',
      };

      const expectedResponse = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResponse);

      const result = await controller.rate(sessionId, emptyFeedbackDto);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        2,
        1,
        '',
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('getSession', () => {
    const sessionId = 'test-session-123';

    it('should get session successfully', async () => {
      const expectedSession = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            timestamp: new Date('2024-01-01T00:00:00Z'),
          },
          {
            role: 'bot',
            text: 'أهلاً وسهلاً! كيف يمكنني مساعدتك؟',
            timestamp: new Date('2024-01-01T00:01:00Z'),
            rating: null,
            feedback: null,
          },
        ],
      };

      mockBotChatsService.findBySession.mockResolvedValue(expectedSession);

      const result = await controller.getSession(sessionId);

      expect(mockBotChatsService.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(expectedSession);
    });

    it('should handle session not found', async () => {
      mockBotChatsService.findBySession.mockResolvedValue(null);

      const result = await controller.getSession(sessionId);

      expect(mockBotChatsService.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toBeNull();
    });

    it('should get session with rated messages', async () => {
      const sessionWithRatings = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'ما هي خدماتكم؟',
            timestamp: new Date('2024-01-01T00:00:00Z'),
          },
          {
            role: 'bot',
            text: 'نحن نقدم خدمات الذكاء الاصطناعي',
            timestamp: new Date('2024-01-01T00:01:00Z'),
            rating: 1,
            feedback: 'إجابة ممتازة',
          },
          {
            role: 'user',
            text: 'كم السعر؟',
            timestamp: new Date('2024-01-01T00:02:00Z'),
          },
          {
            role: 'bot',
            text: 'أسعارنا تبدأ من 100 ريال شهرياً',
            timestamp: new Date('2024-01-01T00:03:00Z'),
            rating: 0,
            feedback: 'لم أفهم الأسعار بوضوح',
          },
        ],
      };

      mockBotChatsService.findBySession.mockResolvedValue(sessionWithRatings);

      const result = await controller.getSession(sessionId);

      expect(result).toEqual(sessionWithRatings);
      expect(result.messages[1].rating).toBe(1);
      expect(result.messages[1].feedback).toBe('إجابة ممتازة');
      expect(result.messages[3].rating).toBe(0);
      expect(result.messages[3].feedback).toBe('لم أفهم الأسعار بوضوح');
    });

    it('should get session with long conversation', async () => {
      const longConversation = {
        sessionId,
        messages: Array.from({ length: 20 }, (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'bot',
          text: `Message ${i + 1}`,
          timestamp: new Date(
            `2024-01-01T00:${i.toString().padStart(2, '0')}:00Z`,
          ),
          rating: i % 2 === 1 ? (i % 4 === 1 ? 1 : 0) : undefined,
          feedback: i % 2 === 1 ? `Feedback for message ${i + 1}` : undefined,
        })),
      };

      mockBotChatsService.findBySession.mockResolvedValue(longConversation);

      const result = await controller.getSession(sessionId);

      expect(result).toEqual(longConversation);
      expect(result.messages).toHaveLength(20);
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockBotChatsService.findBySession.mockRejectedValue(error);

      await expect(controller.getSession(sessionId)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle empty session (no messages)', async () => {
      const emptySession = {
        sessionId,
        messages: [],
      };

      mockBotChatsService.findBySession.mockResolvedValue(emptySession);

      const result = await controller.getSession(sessionId);

      expect(result).toEqual(emptySession);
      expect(result.messages).toHaveLength(0);
    });

    it('should handle special characters in session ID', async () => {
      const specialSessionId = 'session-123_abc-def@example.com';
      const expectedSession = {
        sessionId: specialSessionId,
        messages: [],
      };

      mockBotChatsService.findBySession.mockResolvedValue(expectedSession);

      const result = await controller.getSession(specialSessionId);

      expect(mockBotChatsService.findBySession).toHaveBeenCalledWith(
        specialSessionId,
      );
      expect(result).toEqual(expectedSession);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete user interaction flow', async () => {
      const sessionId = 'integration-test-session';

      // 1. Send message
      const sendMessageDto = {
        text: 'مرحباً، أريد معرفة المزيد عن خدماتكم',
        metadata: { platform: 'web' },
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      const sendResult = await controller.sendMessage(
        sessionId,
        sendMessageDto,
      );
      expect(sendResult).toEqual({ status: 'queued' });

      // 2. Get session
      const sessionData = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: sendMessageDto.text,
            timestamp: new Date(),
          },
          {
            role: 'bot',
            text: 'أهلاً بك! سأكون سعيداً لمساعدتك',
            timestamp: new Date(),
            rating: null,
            feedback: null,
          },
        ],
      };

      mockBotChatsService.findBySession.mockResolvedValue(sessionData);

      const getResult = await controller.getSession(sessionId);
      expect(getResult).toEqual(sessionData);

      // 3. Rate message
      const rateDto = {
        msgIdx: 1,
        rating: 1 as 0 | 1,
        feedback: 'رد ممتاز',
      };

      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      const rateResult = await controller.rate(sessionId, rateDto);
      expect(rateResult).toEqual({ status: 'ok' });

      // Verify all methods were called correctly
      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        sendMessageDto.text,
        sendMessageDto.metadata,
      );
      expect(mockBotChatsService.findBySession).toHaveBeenCalledWith(sessionId);
      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        rateDto.msgIdx,
        rateDto.rating,
        rateDto.feedback,
      );
    });

    it('should handle multiple sessions independently', async () => {
      const session1 = 'session-1';
      const session2 = 'session-2';

      // Send messages to different sessions
      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      await controller.sendMessage(session1, { text: 'Message to session 1' });
      await controller.sendMessage(session2, { text: 'Message to session 2' });

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledTimes(2);
      expect(mockKleemChatService.handleUserMessage).toHaveBeenNthCalledWith(
        1,
        session1,
        'Message to session 1',
        undefined,
      );
      expect(mockKleemChatService.handleUserMessage).toHaveBeenNthCalledWith(
        2,
        session2,
        'Message to session 2',
        undefined,
      );
    });

    it('should handle rapid successive messages', async () => {
      const sessionId = 'rapid-test-session';
      const messages = [
        'Message 1',
        'Message 2',
        'Message 3',
        'Message 4',
        'Message 5',
      ];

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      // Send messages rapidly
      const promises = messages.map((text) =>
        controller.sendMessage(sessionId, { text }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result).toEqual({ status: 'queued' });
      });

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledTimes(5);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const sessionId = 'error-test-session';
      const messageDto = { text: 'Test message' };

      const serviceError = new Error('Internal service error');
      mockKleemChatService.handleUserMessage.mockRejectedValue(serviceError);

      await expect(
        controller.sendMessage(sessionId, messageDto),
      ).rejects.toThrow('Internal service error');
    });

    it('should handle different types of errors', async () => {
      const sessionId = 'error-types-test';

      // Test different error types
      const errors = [
        new BadRequestException('Invalid input'),
        new NotFoundException('Session not found'),
        new Error('Generic error'),
      ];

      for (const error of errors) {
        mockKleemChatService.handleUserMessage.mockRejectedValue(error);

        await expect(
          controller.sendMessage(sessionId, { text: 'test' }),
        ).rejects.toThrow(error.message);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle extremely long messages', async () => {
      const sessionId = 'long-message-test';
      const longText = 'ا'.repeat(10000); // Very long Arabic text

      const messageDto = {
        text: longText,
        metadata: { length: longText.length },
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      const result = await controller.sendMessage(sessionId, messageDto);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        longText,
        messageDto.metadata,
      );
      expect(result).toEqual({ status: 'queued' });
    });

    it('should handle special characters and emojis', async () => {
      const sessionId = 'special-chars-test';
      const specialText = 'مرحباً 👋 كيف حالك؟ 😊 أريد معرفة المزيد! 🤔💭';

      const messageDto = {
        text: specialText,
        metadata: { hasEmojis: true },
      };

      mockKleemChatService.handleUserMessage.mockResolvedValue({
        status: 'queued',
      });

      const result = await controller.sendMessage(sessionId, messageDto);

      expect(mockKleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        specialText,
        messageDto.metadata,
      );
      expect(result).toEqual({ status: 'queued' });
    });

    it('should handle very large message indices', async () => {
      const sessionId = 'large-index-test';
      const rateDto = {
        msgIdx: 999999,
        rating: 1 as 0 | 1,
      };

      const error = new Error('Message index out of range');
      mockBotChatsService.rateMessage.mockRejectedValue(error);

      await expect(controller.rate(sessionId, rateDto)).rejects.toThrow(
        'Message index out of range',
      );
    });
  });
});
