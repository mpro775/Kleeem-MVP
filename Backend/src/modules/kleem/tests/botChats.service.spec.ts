import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BotChatsService, AppendMessage } from '../botChats/botChats.service';
import { BotChatSession } from '../botChats/schemas/botChats.schema';

describe('BotChatsService', () => {
  let service: BotChatsService;
  let mockBotChatModel: jest.Mocked<Model<BotChatSession>>;

  beforeEach(async () => {
    mockBotChatModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
      find: jest.fn(),
      aggregate: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotChatsService,
        {
          provide: getModelToken(BotChatSession.name),
          useValue: mockBotChatModel,
        },
      ],
    }).compile();

    service = module.get<BotChatsService>(BotChatsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should have model injected', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createOrAppend', () => {
    const sessionId = 'test-session-123';

    it('should create new session when session does not exist', async () => {
      const messages: AppendMessage[] = [
        {
          role: 'user',
          text: 'مرحباً',
          metadata: { platform: 'web' },
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(null);
      const mockCreatedSession = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            metadata: { platform: 'web' },
            timestamp: expect.any(Date),
          },
        ],
      };
      mockBotChatModel.create.mockResolvedValue(mockCreatedSession as any);

      const result = await service.createOrAppend(sessionId, messages);

      expect(mockBotChatModel.findOne).toHaveBeenCalledWith({ sessionId });
      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            metadata: { platform: 'web' },
            timestamp: expect.any(Date),
          },
        ],
      });
      expect(result).toEqual(mockCreatedSession);
    });

    it('should append messages to existing session', async () => {
      const existingMessages = [
        {
          role: 'user',
          text: 'مرحباً',
          metadata: {},
          timestamp: new Date('2024-01-01T00:00:00Z'),
        },
      ];

      const mockExistingSession = {
        sessionId,
        messages: existingMessages,
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue({
          sessionId,
          messages: [
            ...existingMessages,
            {
              role: 'bot',
              text: 'أهلاً بك',
              metadata: {},
              timestamp: expect.any(Date),
            },
          ],
        }),
      };

      const newMessages: AppendMessage[] = [
        {
          role: 'bot',
          text: 'أهلاً بك',
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(mockExistingSession as any);

      const result = await service.createOrAppend(sessionId, newMessages);

      expect(mockExistingSession.messages).toHaveLength(2);
      expect(mockExistingSession.messages[1]).toEqual({
        role: 'bot',
        text: 'أهلاً بك',
        metadata: {},
        timestamp: expect.any(Date),
      });
      expect(mockExistingSession.markModified).toHaveBeenCalledWith('messages');
      expect(mockExistingSession.save).toHaveBeenCalled();
    });

    it('should handle multiple messages at once', async () => {
      const messages: AppendMessage[] = [
        {
          role: 'user',
          text: 'مرحباً',
          metadata: { source: 'web' },
        },
        {
          role: 'bot',
          text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
          metadata: { generated: true },
        },
        {
          role: 'user',
          text: 'أريد معرفة الأسعار',
          metadata: { intent: 'pricing' },
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(null);
      const mockCreatedSession = {
        sessionId,
        messages: messages.map((m) => ({
          ...m,
          metadata: m.metadata || {},
          timestamp: expect.any(Date),
        })),
      };
      mockBotChatModel.create.mockResolvedValue(mockCreatedSession as any);

      const result = await service.createOrAppend(sessionId, messages);

      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId,
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            text: 'مرحباً',
            metadata: { source: 'web' },
          }),
          expect.objectContaining({
            role: 'bot',
            text: 'أهلاً بك! كيف يمكنني مساعدتك؟',
            metadata: { generated: true },
          }),
          expect.objectContaining({
            role: 'user',
            text: 'أريد معرفة الأسعار',
            metadata: { intent: 'pricing' },
          }),
        ]),
      });
    });

    it('should set default metadata when not provided', async () => {
      const messages: AppendMessage[] = [
        {
          role: 'user',
          text: 'رسالة بدون metadata',
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(null);
      const mockCreatedSession = { sessionId, messages: [] };
      mockBotChatModel.create.mockResolvedValue(mockCreatedSession as any);

      await service.createOrAppend(sessionId, messages);

      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId,
        messages: [
          expect.objectContaining({
            metadata: {},
          }),
        ],
      });
    });

    it('should set default timestamp when not provided', async () => {
      const messages: AppendMessage[] = [
        {
          role: 'user',
          text: 'رسالة بدون timestamp',
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(null);
      mockBotChatModel.create.mockResolvedValue({} as any);

      await service.createOrAppend(sessionId, messages);

      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId,
        messages: [
          expect.objectContaining({
            timestamp: expect.any(Date),
          }),
        ],
      });
    });

    it('should use provided timestamp when given', async () => {
      const customTimestamp = new Date('2024-01-01T12:00:00Z');
      const messages: AppendMessage[] = [
        {
          role: 'user',
          text: 'رسالة مع timestamp محدد',
          timestamp: customTimestamp,
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(null);
      mockBotChatModel.create.mockResolvedValue({} as any);

      await service.createOrAppend(sessionId, messages);

      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId,
        messages: [
          expect.objectContaining({
            timestamp: customTimestamp,
          }),
        ],
      });
    });

    it('should handle empty messages array', async () => {
      mockBotChatModel.findOne.mockResolvedValue(null);
      mockBotChatModel.create.mockResolvedValue({} as any);

      await service.createOrAppend(sessionId, []);

      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId,
        messages: [],
      });
    });

    it('should handle long session IDs', async () => {
      const longSessionId = 'session-' + 'a'.repeat(1000);
      const messages: AppendMessage[] = [
        {
          role: 'user',
          text: 'test message',
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(null);
      mockBotChatModel.create.mockResolvedValue({} as any);

      await service.createOrAppend(longSessionId, messages);

      expect(mockBotChatModel.findOne).toHaveBeenCalledWith({
        sessionId: longSessionId,
      });
      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId: longSessionId,
        messages: expect.any(Array),
      });
    });
  });

  describe('rateMessage', () => {
    const sessionId = 'rate-test-session';

    it('should rate message successfully', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'سؤال',
            metadata: {},
            timestamp: new Date(),
          },
          {
            role: 'bot',
            text: 'جواب',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      const result = await service.rateMessage(sessionId, 1, 1, 'إجابة ممتازة');

      expect(mockSession.messages[1].rating).toBe(1);
      expect(mockSession.messages[1].feedback).toBe('إجابة ممتازة');
      expect(mockSession.save).toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok' });
    });

    it('should rate message without feedback', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'رد البوت',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      const result = await service.rateMessage(sessionId, 0, 0);

      expect(mockSession.messages[0].rating).toBe(0);
      expect(mockSession.messages[0].feedback).toBeUndefined();
      expect(mockSession.save).toHaveBeenCalled();
      expect(result).toEqual({ status: 'ok' });
    });

    it('should throw error when session not found', async () => {
      mockBotChatModel.findOne.mockResolvedValue(null);

      await expect(service.rateMessage(sessionId, 0, 1)).rejects.toThrow(
        'Message not found for rating',
      );
    });

    it('should throw error when message index is out of range', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'رد واحد فقط',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn(),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      await expect(service.rateMessage(sessionId, 5, 1)).rejects.toThrow(
        'Message not found for rating',
      );
    });

    it('should throw error when message index is negative', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'رد',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn(),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      await expect(service.rateMessage(sessionId, -1, 1)).rejects.toThrow(
        'Message not found for rating',
      );
    });

    it('should handle rating with positive value (1)', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'إجابة جيدة',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      await service.rateMessage(sessionId, 0, 1, 'ممتاز');

      expect(mockSession.messages[0].rating).toBe(1);
      expect(mockSession.messages[0].feedback).toBe('ممتاز');
    });

    it('should handle rating with negative value (0)', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'إجابة ضعيفة',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      await service.rateMessage(sessionId, 0, 0, 'غير مفيد');

      expect(mockSession.messages[0].rating).toBe(0);
      expect(mockSession.messages[0].feedback).toBe('غير مفيد');
    });

    it('should handle empty feedback string', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'رد',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      await service.rateMessage(sessionId, 0, 1, '');

      expect(mockSession.messages[0].rating).toBe(1);
      expect(mockSession.messages[0].feedback).toBe('');
    });

    it('should only set feedback when string is provided', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'رد',
            metadata: {},
            timestamp: new Date(),
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      // Test with undefined feedback
      await service.rateMessage(sessionId, 0, 1, undefined);
      expect(mockSession.messages[0].feedback).toBeUndefined();

      // Test with null feedback (should not set)
      await service.rateMessage(sessionId, 0, 0, null as any);
      expect(mockSession.messages[0].feedback).toBeUndefined();
    });
  });

  describe('findBySession', () => {
    const sessionId = 'find-test-session';

    it('should find session by ID', async () => {
      const mockSession = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            metadata: {},
            timestamp: new Date(),
          },
        ],
      };

      const mockLeanQuery = {
        lean: jest.fn().mockResolvedValue(mockSession),
      };
      mockBotChatModel.findOne.mockReturnValue(mockLeanQuery as any);

      const result = await service.findBySession(sessionId);

      expect(mockBotChatModel.findOne).toHaveBeenCalledWith({ sessionId });
      expect(mockLeanQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should return null when session not found', async () => {
      const mockLeanQuery = {
        lean: jest.fn().mockResolvedValue(null),
      };
      mockBotChatModel.findOne.mockReturnValue(mockLeanQuery as any);

      const result = await service.findBySession('non-existent-session');

      expect(result).toBeNull();
    });

    it('should return lean objects (no mongoose methods)', async () => {
      const mockSession = {
        sessionId,
        messages: [],
      };

      const mockLeanQuery = {
        lean: jest.fn().mockResolvedValue(mockSession),
      };
      mockBotChatModel.findOne.mockReturnValue(mockLeanQuery as any);

      const result = await service.findBySession(sessionId);

      expect(mockLeanQuery.lean).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });
  });

  describe('findAll', () => {
    it('should find all sessions with pagination', async () => {
      const mockSessions = [
        { sessionId: 'session-1', messages: [] },
        { sessionId: 'session-2', messages: [] },
      ];

      mockBotChatModel.countDocuments.mockResolvedValue(2);

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSessions),
      };
      mockBotChatModel.find.mockReturnValue(mockQuery as any);

      const result = await service.findAll(1, 20);

      expect(mockBotChatModel.countDocuments).toHaveBeenCalledWith({});
      expect(mockBotChatModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
      expect(mockQuery.sort).toHaveBeenCalledWith({ updatedAt: -1 });
      expect(mockQuery.lean).toHaveBeenCalled();

      expect(result).toEqual({
        data: mockSessions,
        total: 2,
      });
    });

    it('should handle search query', async () => {
      const searchQuery = 'مرحباً';
      const mockSessions = [{ sessionId: 'session-1', messages: [] }];

      mockBotChatModel.countDocuments.mockResolvedValue(1);

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockSessions),
      };
      mockBotChatModel.find.mockReturnValue(mockQuery as any);

      const result = await service.findAll(1, 20, searchQuery);

      expect(mockBotChatModel.countDocuments).toHaveBeenCalledWith({
        'messages.text': { $regex: searchQuery, $options: 'i' },
      });
      expect(mockBotChatModel.find).toHaveBeenCalledWith({
        'messages.text': { $regex: searchQuery, $options: 'i' },
      });

      expect(result).toEqual({
        data: mockSessions,
        total: 1,
      });
    });

    it('should handle different page sizes', async () => {
      mockBotChatModel.countDocuments.mockResolvedValue(100);

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockBotChatModel.find.mockReturnValue(mockQuery as any);

      await service.findAll(3, 50);

      expect(mockQuery.skip).toHaveBeenCalledWith(100); // (3-1) * 50
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
    });

    it('should use default pagination values', async () => {
      mockBotChatModel.countDocuments.mockResolvedValue(0);

      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockBotChatModel.find.mockReturnValue(mockQuery as any);

      await service.findAll();

      expect(mockQuery.skip).toHaveBeenCalledWith(0); // (1-1) * 20
      expect(mockQuery.limit).toHaveBeenCalledWith(20);
    });
  });

  describe('getTopQuestions', () => {
    it('should get top user questions', async () => {
      const mockAggregateResult = [
        { _id: 'ما هي خدماتكم؟', count: 10 },
        { _id: 'كم السعر؟', count: 8 },
        { _id: 'أين مقركم؟', count: 5 },
      ];

      mockBotChatModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getTopQuestions(10);

      expect(mockBotChatModel.aggregate).toHaveBeenCalledWith([
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'user' } },
        { $group: { _id: '$messages.text', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      expect(result).toEqual([
        { question: 'ما هي خدماتكم؟', count: 10 },
        { question: 'كم السعر؟', count: 8 },
        { question: 'أين مقركم؟', count: 5 },
      ]);
    });

    it('should use default limit', async () => {
      mockBotChatModel.aggregate.mockResolvedValue([]);

      await service.getTopQuestions();

      expect(mockBotChatModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([{ $limit: 10 }]),
      );
    });

    it('should handle empty results', async () => {
      mockBotChatModel.aggregate.mockResolvedValue([]);

      const result = await service.getTopQuestions();

      expect(result).toEqual([]);
    });

    it('should handle custom limit', async () => {
      mockBotChatModel.aggregate.mockResolvedValue([]);

      await service.getTopQuestions(25);

      expect(mockBotChatModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([{ $limit: 25 }]),
      );
    });
  });

  describe('getFrequentBadBotReplies', () => {
    it('should get frequent bad bot replies', async () => {
      const mockAggregateResult = [
        {
          _id: 'لا أفهم السؤال',
          count: 15,
          feedbacks: ['غير واضح', 'غير مفيد', null, 'سيء'],
        },
        {
          _id: 'عذراً، لا أستطيع المساعدة',
          count: 8,
          feedbacks: ['غير مفيد', null],
        },
      ];

      mockBotChatModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getFrequentBadBotReplies(10);

      expect(mockBotChatModel.aggregate).toHaveBeenCalledWith([
        { $unwind: '$messages' },
        { $match: { 'messages.role': 'bot', 'messages.rating': 0 } },
        {
          $group: {
            _id: '$messages.text',
            count: { $sum: 1 },
            feedbacks: { $push: '$messages.feedback' },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);

      expect(result).toEqual([
        {
          text: 'لا أفهم السؤال',
          count: 15,
          feedbacks: ['غير واضح', 'غير مفيد', 'سيء'],
        },
        {
          text: 'عذراً، لا أستطيع المساعدة',
          count: 8,
          feedbacks: ['غير مفيد'],
        },
      ]);
    });

    it('should filter out null and undefined feedbacks', async () => {
      const mockAggregateResult = [
        {
          _id: 'رد سيء',
          count: 5,
          feedbacks: [null, undefined, '', 'تعليق حقيقي', null],
        },
      ];

      mockBotChatModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getFrequentBadBotReplies();

      expect(result[0].feedbacks).toEqual(['تعليق حقيقي']);
    });

    it('should use default limit', async () => {
      mockBotChatModel.aggregate.mockResolvedValue([]);

      await service.getFrequentBadBotReplies();

      expect(mockBotChatModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([{ $limit: 10 }]),
      );
    });

    it('should handle custom limit', async () => {
      mockBotChatModel.aggregate.mockResolvedValue([]);

      await service.getFrequentBadBotReplies(20);

      expect(mockBotChatModel.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([{ $limit: 20 }]),
      );
    });

    it('should handle empty results', async () => {
      mockBotChatModel.aggregate.mockResolvedValue([]);

      const result = await service.getFrequentBadBotReplies();

      expect(result).toEqual([]);
    });

    it('should handle results with empty feedbacks array', async () => {
      const mockAggregateResult = [
        {
          _id: 'رد بدون تعليقات',
          count: 3,
          feedbacks: [],
        },
      ];

      mockBotChatModel.aggregate.mockResolvedValue(mockAggregateResult);

      const result = await service.getFrequentBadBotReplies();

      expect(result[0].feedbacks).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockBotChatModel.findOne.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(service.createOrAppend('test-session', [])).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle save errors', async () => {
      const mockSession = {
        sessionId: 'error-session',
        messages: [],
        markModified: jest.fn(),
        save: jest.fn().mockRejectedValue(new Error('Save failed')),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      await expect(
        service.createOrAppend('error-session', [
          { role: 'user', text: 'test' },
        ]),
      ).rejects.toThrow('Save failed');
    });

    it('should handle aggregation errors', async () => {
      mockBotChatModel.aggregate.mockRejectedValue(
        new Error('Aggregation failed'),
      );

      await expect(service.getTopQuestions()).rejects.toThrow(
        'Aggregation failed',
      );
    });

    it('should handle invalid ObjectId formats gracefully', async () => {
      // This would typically be handled by mongoose, but we can test our service behavior
      const invalidSessionId = 'invalid-session-id-format';

      mockBotChatModel.findOne.mockResolvedValue(null);

      const result = await service.findBySession(invalidSessionId);

      expect(result).toBeNull();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle very long session IDs', async () => {
      const longSessionId = 'session-' + 'a'.repeat(10000);

      mockBotChatModel.findOne.mockResolvedValue(null);
      mockBotChatModel.create.mockResolvedValue({} as any);

      await service.createOrAppend(longSessionId, [
        { role: 'user', text: 'test' },
      ]);

      expect(mockBotChatModel.findOne).toHaveBeenCalledWith({
        sessionId: longSessionId,
      });
    });

    it('should handle very long message texts', async () => {
      const longText = 'a'.repeat(100000);
      const messages: AppendMessage[] = [
        {
          role: 'user',
          text: longText,
        },
      ];

      mockBotChatModel.findOne.mockResolvedValue(null);
      mockBotChatModel.create.mockResolvedValue({} as any);

      await service.createOrAppend('test-session', messages);

      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId: 'test-session',
        messages: [
          expect.objectContaining({
            text: longText,
          }),
        ],
      });
    });

    it('should handle large numbers of messages in single append', async () => {
      const manyMessages: AppendMessage[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          role: i % 2 === 0 ? 'user' : 'bot',
          text: `Message ${i}`,
        }),
      );

      mockBotChatModel.findOne.mockResolvedValue(null);
      mockBotChatModel.create.mockResolvedValue({} as any);

      await service.createOrAppend('bulk-session', manyMessages);

      expect(mockBotChatModel.create).toHaveBeenCalledWith({
        sessionId: 'bulk-session',
        messages: expect.arrayContaining([
          expect.objectContaining({ text: 'Message 0' }),
          expect.objectContaining({ text: 'Message 999' }),
        ]),
      });
    });

    it('should handle concurrent operations on same session', async () => {
      const sessionId = 'concurrent-session';
      const mockSession = {
        sessionId,
        messages: [],
        markModified: jest.fn(),
        save: jest.fn().mockResolvedValue({}),
      };

      mockBotChatModel.findOne.mockResolvedValue(mockSession as any);

      // Simulate concurrent append operations
      const promises = Array.from({ length: 10 }, (_, i) =>
        service.createOrAppend(sessionId, [
          { role: 'user', text: `Concurrent message ${i}` },
        ]),
      );

      await Promise.all(promises);

      expect(mockBotChatModel.findOne).toHaveBeenCalledTimes(10);
      expect(mockSession.save).toHaveBeenCalledTimes(10);
    });

    it('should handle special characters in search queries', async () => {
      const specialQuery = '.*+?^${}()|[]\\مرحباً';

      mockBotChatModel.countDocuments.mockResolvedValue(0);
      const mockQuery = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      };
      mockBotChatModel.find.mockReturnValue(mockQuery as any);

      await service.findAll(1, 20, specialQuery);

      expect(mockBotChatModel.find).toHaveBeenCalledWith({
        'messages.text': { $regex: specialQuery, $options: 'i' },
      });
    });
  });

  describe('AppendMessage Interface Validation', () => {
    it('should validate AppendMessage structure', () => {
      const validMessage: AppendMessage = {
        role: 'user',
        text: 'Test message',
        metadata: { key: 'value' },
        timestamp: new Date(),
      };

      expect(validMessage.role).toBeDefined();
      expect(validMessage.text).toBeDefined();
      expect(typeof validMessage.role).toBe('string');
      expect(typeof validMessage.text).toBe('string');
    });

    it('should handle optional fields in AppendMessage', () => {
      const minimalMessage: AppendMessage = {
        role: 'bot',
        text: 'Minimal message',
      };

      expect(minimalMessage.metadata).toBeUndefined();
      expect(minimalMessage.timestamp).toBeUndefined();
    });

    it('should support both user and bot roles', () => {
      const userMessage: AppendMessage = {
        role: 'user',
        text: 'User message',
      };

      const botMessage: AppendMessage = {
        role: 'bot',
        text: 'Bot message',
      };

      expect(userMessage.role).toBe('user');
      expect(botMessage.role).toBe('bot');
    });
  });
});
