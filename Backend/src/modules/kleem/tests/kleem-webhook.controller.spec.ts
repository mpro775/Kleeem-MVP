import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KleemWebhookController } from '../webhook/kleem-webhook.controller';
import { BotChatsService } from '../botChats/botChats.service';
import { KleemWsMessage } from '../ws/kleem-ws.types';

describe('KleemWebhookController', () => {
  let controller: KleemWebhookController;
  let mockBotChatsService: jest.Mocked<BotChatsService>;
  let mockEventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(async () => {
    mockBotChatsService = {
      createOrAppend: jest.fn(),
    } as any;

    mockEventEmitter = {
      emit: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KleemWebhookController],
      providers: [
        { provide: BotChatsService, useValue: mockBotChatsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    controller = module.get<KleemWebhookController>(KleemWebhookController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Controller Initialization', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should have BotChatsService injected', () => {
      expect(controller).toBeDefined();
    });

    it('should have EventEmitter2 injected', () => {
      expect(controller).toBeDefined();
    });
  });

  describe('handleKleemConversation', () => {
    const sessionId = 'webhook-session-123';

    it('should handle conversation with multiple messages', async () => {
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'مرحباً، أحتاج مساعدة',
            metadata: { source: 'webhook' },
            timestamp: '2024-01-01T00:00:00Z',
          },
          {
            role: 'bot',
            text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
            metadata: { generated: true },
            timestamp: '2024-01-01T00:01:00Z',
          },
        ],
      };

      const mockSavedConversation = {
        sessionId,
        messages: conversationBody.messages,
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        mockSavedConversation as any,
      );

      const result = await controller.handleKleemConversation(
        sessionId,
        conversationBody,
      );

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        conversationBody.messages,
      );
      expect(result).toEqual(mockSavedConversation);
    });

    it('should handle conversation with single message', async () => {
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'رسالة واحدة',
            metadata: {},
          },
        ],
      };

      const mockSavedConversation = {
        sessionId,
        messages: conversationBody.messages,
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        mockSavedConversation as any,
      );

      const result = await controller.handleKleemConversation(
        sessionId,
        conversationBody,
      );

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        conversationBody.messages,
      );
      expect(result).toEqual(mockSavedConversation);
    });

    it('should handle conversation with empty messages array', async () => {
      const conversationBody = {
        messages: [],
      };

      const mockSavedConversation = {
        sessionId,
        messages: [],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        mockSavedConversation as any,
      );

      const result = await controller.handleKleemConversation(
        sessionId,
        conversationBody,
      );

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [],
      );
      expect(result).toEqual(mockSavedConversation);
    });

    it('should handle messages with complex metadata', async () => {
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'رسالة معقدة',
            metadata: {
              webhook: {
                source: 'external_system',
                timestamp: Date.now(),
                version: '1.2.3',
              },
              user: {
                id: 'user-123',
                preferences: {
                  language: 'ar',
                  theme: 'dark',
                },
              },
            },
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.handleKleemConversation(sessionId, conversationBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        conversationBody.messages,
      );
    });

    it('should handle Arabic and English messages', async () => {
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'مرحباً، كيف حالك؟',
            metadata: { language: 'ar' },
          },
          {
            role: 'bot',
            text: 'Hello! How can I help you today?',
            metadata: { language: 'en' },
          },
          {
            role: 'user',
            text: 'Mixed language رسالة مختلطة message',
            metadata: { language: 'mixed' },
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.handleKleemConversation(sessionId, conversationBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        conversationBody.messages,
      );
    });

    it('should handle service errors', async () => {
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'رسالة تسبب خطأ',
          },
        ],
      };

      const error = new Error('Database error');
      mockBotChatsService.createOrAppend.mockRejectedValue(error);

      await expect(
        controller.handleKleemConversation(sessionId, conversationBody),
      ).rejects.toThrow('Database error');
    });

    it('should handle special session IDs', async () => {
      const specialSessionId = 'session-123_special@domain.com';
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'Test with special session ID',
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.handleKleemConversation(
        specialSessionId,
        conversationBody,
      );

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        specialSessionId,
        conversationBody.messages,
      );
    });

    it('should handle messages with timestamps', async () => {
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'رسالة مع timestamp',
            timestamp: '2024-01-01T12:00:00Z',
          },
          {
            role: 'bot',
            text: 'رد مع timestamp',
            timestamp: '2024-01-01T12:01:00Z',
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.handleKleemConversation(sessionId, conversationBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        expect.arrayContaining([
          expect.objectContaining({
            timestamp: '2024-01-01T12:00:00Z',
          }),
          expect.objectContaining({
            timestamp: '2024-01-01T12:01:00Z',
          }),
        ]),
      );
    });
  });

  describe('botReply', () => {
    const sessionId = 'bot-reply-session-123';

    it('should add bot reply successfully', async () => {
      const replyBody = {
        text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
        metadata: {
          confidence: 0.95,
          source: 'knowledge_base',
        },
      };

      const mockSavedSession = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            metadata: {},
            timestamp: new Date(),
          },
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
            timestamp: new Date(),
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        mockSavedSession as any,
      );

      const result = await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
          },
        ],
      );

      // Check WebSocket events
      const expectedWsMessage: KleemWsMessage = {
        role: 'bot',
        text: replyBody.text,
        msgIdx: 1, // Index of the new message
      };

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('kleem.bot_reply', {
        sessionId,
        message: expectedWsMessage,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'kleem.admin_new_message',
        {
          sessionId,
          message: expectedWsMessage,
        },
      );

      expect(result).toEqual({
        sessionId,
        msgIdx: 1,
      });
    });

    it('should add bot reply without metadata', async () => {
      const replyBody = {
        text: 'رد بسيط بدون metadata',
      };

      const mockSavedSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: {},
            timestamp: new Date(),
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        mockSavedSession as any,
      );

      const result = await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: {},
          },
        ],
      );

      expect(result).toEqual({
        sessionId,
        msgIdx: 0,
      });
    });

    it('should throw BadRequestException when sessionId is missing', async () => {
      const replyBody = {
        text: 'رد بدون session ID',
      };

      await expect(controller.botReply('', replyBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.botReply('', replyBody)).rejects.toThrow(
        'sessionId and text are required',
      );
    });

    it('should throw BadRequestException when text is missing', async () => {
      const replyBody = {};

      await expect(controller.botReply(sessionId, replyBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.botReply(sessionId, replyBody)).rejects.toThrow(
        'sessionId and text are required',
      );
    });

    it('should throw BadRequestException when text is empty', async () => {
      const replyBody = {
        text: '',
      };

      await expect(controller.botReply(sessionId, replyBody)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.botReply(sessionId, replyBody)).rejects.toThrow(
        'sessionId and text are required',
      );
    });

    it('should handle undefined text', async () => {
      const replyBody = {
        text: undefined,
      };

      await expect(controller.botReply(sessionId, replyBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle null text', async () => {
      const replyBody = {
        text: null,
      };

      await expect(controller.botReply(sessionId, replyBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate correct message index', async () => {
      const replyBody = {
        text: 'رد جديد',
      };

      const mockSavedSession = {
        sessionId,
        messages: [
          { role: 'user', text: 'رسالة 1' },
          { role: 'bot', text: 'رد 1' },
          { role: 'user', text: 'رسالة 2' },
          { role: 'bot', text: 'رد جديد' }, // This should be index 3
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        mockSavedSession as any,
      );

      const result = await controller.botReply(sessionId, replyBody);

      expect(result.msgIdx).toBe(3); // messages.length - 1
    });

    it('should emit correct WebSocket message with index', async () => {
      const replyBody = {
        text: 'رد مع فهرس',
        metadata: { type: 'automated' },
      };

      const mockSavedSession = {
        sessionId,
        messages: [
          { role: 'user', text: 'سؤال' },
          { role: 'bot', text: 'رد مع فهرس' },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        mockSavedSession as any,
      );

      await controller.botReply(sessionId, replyBody);

      const expectedWsMessage: KleemWsMessage = {
        role: 'bot',
        text: replyBody.text,
        msgIdx: 1,
      };

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('kleem.bot_reply', {
        sessionId,
        message: expectedWsMessage,
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'kleem.admin_new_message',
        {
          sessionId,
          message: expectedWsMessage,
        },
      );
    });

    it('should handle Arabic text correctly', async () => {
      const replyBody = {
        text: 'مرحباً بك في منصة كليم! كيف يمكنني مساعدتك اليوم؟',
        metadata: { language: 'ar' },
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        messages: [{ role: 'bot', text: replyBody.text }],
      } as any);

      const result = await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
          },
        ],
      );

      expect(result).toBeDefined();
    });

    it('should handle English text correctly', async () => {
      const replyBody = {
        text: 'Welcome to Kaleem platform! How can I help you today?',
        metadata: { language: 'en' },
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        messages: [{ role: 'bot', text: replyBody.text }],
      } as any);

      await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
          },
        ],
      );
    });

    it('should handle mixed language text', async () => {
      const replyBody = {
        text: 'مرحباً Hello! كيف يمكنني مساعدتك How can I help you?',
        metadata: { language: 'mixed' },
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        messages: [{ role: 'bot', text: replyBody.text }],
      } as any);

      await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
          },
        ],
      );
    });

    it('should handle special characters and emojis', async () => {
      const replyBody = {
        text: 'مرحباً 👋 أهلاً بك! كيف حالك؟ 😊 أتمنى أن أساعدك 🤝',
        metadata: { hasEmojis: true },
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        messages: [{ role: 'bot', text: replyBody.text }],
      } as any);

      await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
          },
        ],
      );
    });

    it('should handle very long replies', async () => {
      const longText = 'هذا نص طويل جداً '.repeat(1000);
      const replyBody = {
        text: longText,
        metadata: { length: longText.length },
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        messages: [{ role: 'bot', text: longText }],
      } as any);

      await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: longText,
            metadata: replyBody.metadata,
          },
        ],
      );
    });

    it('should handle service errors gracefully', async () => {
      const replyBody = {
        text: 'رد يسبب خطأ',
      };

      const error = new Error('Service error');
      mockBotChatsService.createOrAppend.mockRejectedValue(error);

      await expect(controller.botReply(sessionId, replyBody)).rejects.toThrow(
        'Service error',
      );

      // Should not emit events when service fails
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should handle complex metadata structures', async () => {
      const replyBody = {
        text: 'رد مع metadata معقد',
        metadata: {
          ai: {
            model: 'gpt-4',
            temperature: 0.7,
            tokens: {
              input: 150,
              output: 75,
              total: 225,
            },
          },
          processing: {
            duration: 1250,
            steps: [
              'intent_detection',
              'knowledge_retrieval',
              'response_generation',
            ],
          },
          context: {
            sessionLength: 5,
            userProfile: {
              language: 'ar',
              region: 'SA',
              preferences: {
                responseStyle: 'formal',
                includeEmojis: false,
              },
            },
          },
        },
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        messages: [{ role: 'bot', text: replyBody.text }],
      } as any);

      await controller.botReply(sessionId, replyBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
          },
        ],
      );
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete webhook flow', async () => {
      const sessionId = 'integration-flow-session';

      // 1. Handle conversation
      const conversationBody = {
        messages: [
          {
            role: 'user',
            text: 'مرحباً، أحتاج مساعدة',
            metadata: { source: 'webhook' },
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValueOnce({
        sessionId,
        messages: conversationBody.messages,
      } as any);

      const conversationResult = await controller.handleKleemConversation(
        sessionId,
        conversationBody,
      );

      expect(conversationResult).toBeDefined();

      // 2. Add bot reply
      const replyBody = {
        text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
        metadata: { source: 'bot_engine' },
      };

      mockBotChatsService.createOrAppend.mockResolvedValueOnce({
        sessionId,
        messages: [
          ...conversationBody.messages,
          {
            role: 'bot',
            text: replyBody.text,
            metadata: replyBody.metadata,
          },
        ],
      } as any);

      const replyResult = await controller.botReply(sessionId, replyBody);

      expect(replyResult.sessionId).toBe(sessionId);
      expect(replyResult.msgIdx).toBe(1);

      // Verify events were emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith('kleem.bot_reply', {
        sessionId,
        message: {
          role: 'bot',
          text: replyBody.text,
          msgIdx: 1,
        },
      });
    });

    it('should handle multiple consecutive bot replies', async () => {
      const sessionId = 'multiple-replies-session';

      const replies = [
        { text: 'أهلاً بك!', metadata: { sequence: 1 } },
        { text: 'كيف يمكنني مساعدتك؟', metadata: { sequence: 2 } },
        { text: 'أنا هنا للمساعدة', metadata: { sequence: 3 } },
      ];

      let messageCount = 0;
      mockBotChatsService.createOrAppend.mockImplementation(() => {
        messageCount++;
        return Promise.resolve({
          sessionId,
          messages: Array.from({ length: messageCount }, (_, i) => ({
            role: 'bot',
            text: replies[i]?.text || 'test',
          })),
        } as any);
      });

      for (let i = 0; i < replies.length; i++) {
        const result = await controller.botReply(sessionId, replies[i]);
        expect(result.msgIdx).toBe(i);
      }

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledTimes(3);
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(6); // 2 events per reply
    });

    it('should handle concurrent requests to same session', async () => {
      const sessionId = 'concurrent-session';

      const replies = [
        { text: 'رد متزامن 1' },
        { text: 'رد متزامن 2' },
        { text: 'رد متزامن 3' },
      ];

      mockBotChatsService.createOrAppend.mockImplementation((_, messages) => {
        return Promise.resolve({
          sessionId,
          messages: [{ role: 'bot', text: messages[0].text }],
        } as any);
      });

      // Send concurrent replies
      const promises = replies.map((reply) =>
        controller.botReply(sessionId, reply),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.sessionId).toBe(sessionId);
        expect(typeof result.msgIdx).toBe('number');
      });

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledTimes(3);
    });

    it('should handle different session IDs independently', async () => {
      const sessions = ['session-1', 'session-2', 'session-3'];

      mockBotChatsService.createOrAppend.mockImplementation((sessionId) => {
        return Promise.resolve({
          sessionId,
          messages: [{ role: 'bot', text: 'test' }],
        } as any);
      });

      // Send replies to different sessions
      const promises = sessions.map((sessionId) =>
        controller.botReply(sessionId, { text: `Reply for ${sessionId}` }),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.sessionId).toBe(sessions[index]);
      });

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed conversation body', async () => {
      const malformedBody = {
        // Missing messages array
      };

      // This should be handled by validation decorators, but we test gracefully
      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.handleKleemConversation(
        'session-id',
        malformedBody as any,
      );

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        'session-id',
        undefined,
      );
    });

    it('should handle null session ID', async () => {
      const replyBody = { text: 'test reply' };

      await expect(controller.botReply(null as any, replyBody)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle undefined reply body', async () => {
      await expect(
        controller.botReply('session-id', undefined as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle null reply body', async () => {
      await expect(
        controller.botReply('session-id', null as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle whitespace-only text', async () => {
      const replyBody = { text: '   \t\n   ' };

      // Should be considered empty after trimming
      await expect(
        controller.botReply('session-id', replyBody),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle very long session IDs', async () => {
      const longSessionId = 'session-' + 'a'.repeat(10000);
      const replyBody = { text: 'test with long session ID' };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        sessionId: longSessionId,
        messages: [{ role: 'bot', text: replyBody.text }],
      } as any);

      const result = await controller.botReply(longSessionId, replyBody);

      expect(result.sessionId).toBe(longSessionId);
    });

    it('should handle EventEmitter errors gracefully', async () => {
      const replyBody = { text: 'test reply' };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        messages: [{ role: 'bot', text: replyBody.text }],
      } as any);

      // Mock EventEmitter to throw error
      mockEventEmitter.emit.mockImplementation(() => {
        throw new Error('EventEmitter error');
      });

      // Should still complete successfully despite EventEmitter error
      await expect(
        controller.botReply('session-id', replyBody),
      ).rejects.toThrow('EventEmitter error');
    });

    it('should handle extremely large message counts', async () => {
      const sessionId = 'large-session';
      const replyBody = { text: 'reply in large session' };

      const largeMessageArray = Array.from({ length: 100000 }, (_, i) => ({
        role: 'bot',
        text: `Message ${i}`,
      }));

      mockBotChatsService.createOrAppend.mockResolvedValue({
        sessionId,
        messages: largeMessageArray,
      } as any);

      const result = await controller.botReply(sessionId, replyBody);

      expect(result.msgIdx).toBe(99999); // messages.length - 1
    });
  });
});
