import { Test } from '@nestjs/testing';

import { BotChatsService } from '../botChats.service';
import { QueryBotRatingsDto } from '../dto/query-bot-ratings.dto';
import { BOT_CHAT_REPOSITORY } from '../tokens';

import type { BotChatRepository } from '../repositories/bot-chats.repository';
import type { TestingModule } from '@nestjs/testing';

describe('BotChatsService', () => {
  let service: BotChatsService;
  let repository: jest.Mocked<BotChatRepository>;

  const mockRepository = {
    createOrAppend: jest.fn(),
    rateMessage: jest.fn(),
    findBySession: jest.fn(),
    findAll: jest.fn(),
    aggregate: jest.fn(),
    getFrequentBadBotReplies: jest.fn(),
    getTopQuestions: jest.fn(),
  } as jest.Mocked<BotChatRepository>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BotChatsService,
        {
          provide: BOT_CHAT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<BotChatsService>(BotChatsService);
    repository = module.get(BOT_CHAT_REPOSITORY);
  });

  describe('createOrAppend', () => {
    it('should delegate to repository createOrAppend method', async () => {
      const sessionId = 'session_123';
      const messages = [
        {
          role: 'user' as const,
          text: 'مرحباً',
        },
      ];

      const expectedResult = {
        _id: '507f1f77bcf86cd799439011' as any,
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            timestamp: new Date(),
          },
        ],
      } as any;

      repository.createOrAppend.mockResolvedValue(expectedResult);

      const result = await service.createOrAppend(sessionId, messages);

      expect(repository.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messages,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle bot messages with metadata', async () => {
      const sessionId = 'session_456';
      const messages = [
        {
          role: 'bot' as const,
          text: 'مرحباً! كيف يمكنني مساعدتك؟',
          metadata: { source: 'ai', confidence: 0.95 },
          timestamp: new Date(),
        },
      ];

      const expectedResult = {
        _id: '507f1f77bcf86cd799439012' as any,
        sessionId,
        messages,
      };

      repository.createOrAppend.mockResolvedValue(expectedResult as any);

      const result = await service.createOrAppend(sessionId, messages);

      expect(repository.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messages,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle multiple messages in one call', async () => {
      const sessionId = 'session_789';
      const messages = [
        {
          role: 'user' as const,
          text: 'سؤال الأول',
        },
        {
          role: 'bot' as const,
          text: 'إجابة الأولى',
        },
        {
          role: 'user' as const,
          text: 'سؤال الثاني',
        },
      ];

      const expectedResult = {
        _id: '507f1f77bcf86cd799439013' as any,
        sessionId,
        messages,
      };

      repository.createOrAppend.mockResolvedValue(expectedResult as any);

      const result = await service.createOrAppend(sessionId, messages);

      expect(repository.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messages,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty messages array', async () => {
      const sessionId = 'session_empty';
      const messages: any[] = [];

      const expectedResult = {
        _id: '507f1f77bcf86cd799439014' as any,
        sessionId,
        messages: [],
      };

      repository.createOrAppend.mockResolvedValue(expectedResult as any);

      const result = await service.createOrAppend(sessionId, messages);

      expect(repository.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messages,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('rateMessage', () => {
    it('should rate message with thumbs up and return status ok', async () => {
      const sessionId = 'session_123';
      const msgIdx = 0;
      const rating = 1;
      const feedback = 'كان الرد مفيداً جداً';

      repository.rateMessage.mockResolvedValue();

      const result = await service.rateMessage(
        sessionId,
        msgIdx,
        rating,
        feedback,
      );

      expect(repository.rateMessage).toHaveBeenCalledWith(
        sessionId,
        msgIdx,
        rating,
        feedback,
      );
      expect(result).toEqual({ status: 'ok' });
    });

    it('should rate message with thumbs down and return status ok', async () => {
      const sessionId = 'session_456';
      const msgIdx = 2;
      const rating = 0;
      const feedback = 'الرد لم يكن دقيقاً';

      repository.rateMessage.mockResolvedValue();

      const result = await service.rateMessage(
        sessionId,
        msgIdx,
        rating,
        feedback,
      );

      expect(repository.rateMessage).toHaveBeenCalledWith(
        sessionId,
        msgIdx,
        rating,
        feedback,
      );
      expect(result).toEqual({ status: 'ok' });
    });

    it('should rate message without feedback and return status ok', async () => {
      const sessionId = 'session_789';
      const msgIdx = 1;
      const rating = 1;

      repository.rateMessage.mockResolvedValue();

      const result = await service.rateMessage(sessionId, msgIdx, rating);

      expect(repository.rateMessage).toHaveBeenCalledWith(
        sessionId,
        msgIdx,
        rating,
        undefined,
      );
      expect(result).toEqual({ status: 'ok' });
    });

    it('should handle rating messages at different indices', async () => {
      const sessionId = 'session_101';
      const msgIdx = 5;
      const rating = 0;

      repository.rateMessage.mockResolvedValue();

      const result = await service.rateMessage(sessionId, msgIdx, rating);

      expect(repository.rateMessage).toHaveBeenCalledWith(
        sessionId,
        msgIdx,
        rating,
        undefined,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('findBySession', () => {
    it('should return session data when found', async () => {
      const sessionId = 'session_123';
      const expectedResult = {
        _id: '507f1f77bcf86cd799439011' as any,
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            timestamp: new Date(),
          },
        ],
      };

      repository.findBySession.mockResolvedValue(expectedResult as any);

      const result = await service.findBySession(sessionId);

      expect(repository.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(expectedResult);
    });

    it('should return null when session not found', async () => {
      const sessionId = 'nonexistent_session';

      repository.findBySession.mockResolvedValue(null);

      const result = await service.findBySession(sessionId);

      expect(repository.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toBeNull();
    });

    it('should handle empty session ID', async () => {
      const sessionId = '';

      repository.findBySession.mockResolvedValue(null);

      const result = await service.findBySession(sessionId);

      expect(repository.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results with default parameters', async () => {
      const expectedResult = {
        data: [
          {
            _id: '507f1f77bcf86cd799439011' as any,
            sessionId: 'session_1',
            messages: [],
          },
        ],
        total: 1,
      };

      repository.findAll.mockResolvedValue(expectedResult as any);

      const result = await service.findAll(1, 20, undefined);

      expect(repository.findAll).toHaveBeenCalledWith({}, 1, 20);
      expect(result).toEqual(expectedResult);
    });

    it('should return paginated results with custom parameters', async () => {
      const expectedResult = {
        data: [],
        total: 0,
      };

      repository.findAll.mockResolvedValue(expectedResult as any);

      const result = await service.findAll(3, 50, 'test search');

      expect(repository.findAll).toHaveBeenCalledWith(
        { 'messages.text': { $regex: 'test search', $options: 'i' } },
        3,
        50,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty search query', async () => {
      const expectedResult = {
        data: [],
        total: 0,
      };

      repository.findAll.mockResolvedValue(expectedResult as any);

      const result = await service.findAll(1, 20, '');

      expect(repository.findAll).toHaveBeenCalledWith({}, 1, 20);
      expect(result).toEqual(expectedResult);
    });

    it('should handle zero results', async () => {
      const expectedResult = {
        data: [],
        total: 0,
      };

      repository.findAll.mockResolvedValue(expectedResult as any);

      const result = await service.findAll(1, 20, 'nonexistent');

      expect(repository.findAll).toHaveBeenCalledWith(
        { 'messages.text': { $regex: 'nonexistent', $options: 'i' } },
        1,
        20,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle large page numbers', async () => {
      const expectedResult = {
        data: [],
        total: 0,
      };

      repository.findAll.mockResolvedValue(expectedResult as any);

      const result = await service.findAll(1000, 10, 'test');

      expect(repository.findAll).toHaveBeenCalledWith(
        { 'messages.text': { $regex: 'test', $options: 'i' } },
        1000,
        10,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle case insensitive search', async () => {
      const expectedResult = {
        data: [
          {
            _id: '507f1f77bcf86cd799439011' as any,
            sessionId: 'session_1',
            messages: [
              {
                role: 'user',
                text: 'مرحباً',
              },
            ],
          },
        ],
        total: 1,
      };

      repository.findAll.mockResolvedValue(expectedResult as any);

      const result = await service.findAll(1, 20, 'مرحبا');

      expect(repository.findAll).toHaveBeenCalledWith(
        { 'messages.text': { $regex: 'مرحبا', $options: 'i' } },
        1,
        20,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('listBotRatings', () => {
    it('should return bot ratings with default query', async () => {
      const query = new QueryBotRatingsDto();
      query.page = 1;
      query.limit = 20;

      const mockAggregationResult = [
        {
          items: [
            {
              id: '507f1f77bcf86cd799439011:2024-01-15T10:30:00.000Z',
              sessionId: 'session_123',
              updatedAt: new Date('2024-01-15T10:30:00.000Z'),
              message: 'مرحباً، كيف يمكنني مساعدتك؟',
              rating: 1,
              feedback: 'كان الرد مفيداً',
              timestamp: new Date('2024-01-15T10:30:00.000Z'),
            },
          ],
          meta: [{ total: 1 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(repository.aggregate).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.items[0].message).toBe('مرحباً، كيف يمكنني مساعدتك؟');
      expect(result.items[0].rating).toBe(1);
    });

    it('should return bot ratings with rating filter (thumbs up only)', async () => {
      const query = new QueryBotRatingsDto();
      query.rating = '1';
      query.page = 1;
      query.limit = 20;

      const mockAggregationResult = [
        {
          items: [
            {
              id: '507f1f77bcf86cd799439012:2024-01-16T14:20:00.000Z',
              sessionId: 'session_456',
              message: 'رد إيجابي',
              rating: 1,
              timestamp: new Date('2024-01-16T14:20:00.000Z'),
            },
          ],
          meta: [{ total: 1 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(repository.aggregate).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].rating).toBe(1);
    });

    it('should return bot ratings with rating filter (thumbs down only)', async () => {
      const query = new QueryBotRatingsDto();
      query.rating = '0';
      query.page = 1;
      query.limit = 20;

      const mockAggregationResult = [
        {
          items: [
            {
              id: '507f1f77bcf86cd799439013:2024-01-17T09:15:00.000Z',
              sessionId: 'session_789',
              message: 'رد سلبي',
              rating: 0,
              timestamp: new Date('2024-01-17T09:15:00.000Z'),
            },
          ],
          meta: [{ total: 1 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(repository.aggregate).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].rating).toBe(0);
    });

    it('should return bot ratings with search query', async () => {
      const query = new QueryBotRatingsDto();
      query.q = 'مساعدة';
      query.page = 1;
      query.limit = 20;

      const mockAggregationResult = [
        {
          items: [
            {
              id: '507f1f77bcf86cd799439014:2024-01-18T16:45:00.000Z',
              sessionId: 'session_101',
              message: 'أحتاج مساعدة في هذا الأمر',
              rating: 1,
              timestamp: new Date('2024-01-18T16:45:00.000Z'),
            },
          ],
          meta: [{ total: 1 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(repository.aggregate).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].message).toBe('أحتاج مساعدة في هذا الأمر');
    });

    it('should return bot ratings with session filter', async () => {
      const query = new QueryBotRatingsDto();
      query.sessionId = 'specific_session_123';
      query.page = 1;
      query.limit = 20;

      const mockAggregationResult = [
        {
          items: [
            {
              id: '507f1f77bcf86cd799439015:2024-01-19T11:30:00.000Z',
              sessionId: 'specific_session_123',
              message: 'رد من جلسة محددة',
              rating: 1,
              timestamp: new Date('2024-01-19T11:30:00.000Z'),
            },
          ],
          meta: [{ total: 1 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(repository.aggregate).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].sessionId).toBe('specific_session_123');
    });

    it('should return bot ratings with date range filter', async () => {
      const query = new QueryBotRatingsDto();
      query.from = '2024-01-01';
      query.to = '2024-01-31';
      query.page = 1;
      query.limit = 20;

      const mockAggregationResult = [
        {
          items: [
            {
              id: '507f1f77bcf86cd799439016:2024-01-20T08:00:00.000Z',
              sessionId: 'session_2024',
              message: 'رد خلال شهر يناير',
              rating: 1,
              timestamp: new Date('2024-01-20T08:00:00.000Z'),
            },
          ],
          meta: [{ total: 1 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(repository.aggregate).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      const query = new QueryBotRatingsDto();
      query.page = 3;
      query.limit = 10;

      const mockAggregationResult = [
        {
          items: [],
          meta: [{ total: 25 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(25);
      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });

    it('should handle empty results', async () => {
      const query = new QueryBotRatingsDto();
      query.rating = '1';

      const mockAggregationResult = [
        {
          items: [],
          meta: [{ total: 0 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle complex query with all filters', async () => {
      const query = new QueryBotRatingsDto();
      query.rating = '1';
      query.q = 'مساعدة';
      query.sessionId = 'session_123';
      query.from = '2024-01-01';
      query.to = '2024-12-31';
      query.page = 2;
      query.limit = 50;

      const mockAggregationResult = [
        {
          items: [
            {
              id: '507f1f77bcf86cd799439017:2024-01-21T12:00:00.000Z',
              sessionId: 'session_123',
              message: 'مساعدة شاملة في جميع المواضيع',
              rating: 1,
              timestamp: new Date('2024-01-21T12:00:00.000Z'),
            },
          ],
          meta: [{ total: 1 }],
        },
      ];

      repository.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.listBotRatings(query);

      expect(repository.aggregate).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(50);
    });
  });

  describe('botRatingsStats', () => {
    it('should return complete statistics without date filter', async () => {
      const mockSummaryAggregation = [
        {
          totalRated: 150,
          thumbsUp: 120,
          thumbsDown: 30,
          upRate: 0.8,
        },
      ];

      const mockWeeklyAggregation = [
        {
          _id: { y: 2024, w: 3 },
          total: 25,
          up: 20,
          down: 5,
        },
        {
          _id: { y: 2024, w: 2 },
          total: 30,
          up: 24,
          down: 6,
        },
      ];

      const mockTopBadReplies = [
        {
          text: 'لا أفهم سؤالك',
          count: 15,
          feedbacks: ['غير واضح', 'مبهم'],
        },
        {
          text: 'يمكنك توضيح المزيد؟',
          count: 10,
          feedbacks: ['مكرر', 'غير مفيد'],
        },
      ];

      repository.aggregate
        .mockResolvedValueOnce(mockSummaryAggregation)
        .mockResolvedValueOnce(mockWeeklyAggregation);
      repository.getFrequentBadBotReplies.mockResolvedValue(mockTopBadReplies);

      const result = await service.botRatingsStats();

      expect(repository.aggregate).toHaveBeenCalledTimes(2);
      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result.summary.totalRated).toBe(150);
      expect(result.summary.thumbsUp).toBe(120);
      expect(result.summary.thumbsDown).toBe(30);
      expect(result.summary.upRate).toBeDefined();
      expect(result.weekly).toHaveLength(2);
      expect(result.topBad).toHaveLength(2);
      expect(result.topBad[0].text).toBe('لا أفهم سؤالك');
      expect(result.topBad[0].count).toBe(15);
    });

    it('should return statistics with date filter', async () => {
      const from = '2024-01-01';
      const to = '2024-01-31';

      const mockSummaryAggregation = [
        {
          totalRated: 45,
          thumbsUp: 35,
          thumbsDown: 10,
          upRate: 0.777,
        },
      ];

      const mockWeeklyAggregation = [
        {
          _id: { y: 2024, w: 1 },
          total: 45,
          up: 35,
          down: 10,
        },
      ];

      const mockTopBadReplies = [
        {
          text: 'لا أستطيع مساعدتك في هذا',
          count: 8,
          feedbacks: ['خارج النطاق', 'غير متاح'],
        },
      ];

      repository.aggregate
        .mockResolvedValueOnce(mockSummaryAggregation)
        .mockResolvedValueOnce(mockWeeklyAggregation);
      repository.getFrequentBadBotReplies.mockResolvedValue(mockTopBadReplies);

      const result = await service.botRatingsStats(from, to);

      expect(repository.aggregate).toHaveBeenCalledTimes(2);
      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result.summary.totalRated).toBe(45);
      expect(result.summary.thumbsUp).toBe(35);
      expect(result.summary.thumbsDown).toBe(10);
      expect(result.summary.upRate).toBeCloseTo(0.777, 2);
    });

    it('should handle zero ratings gracefully', async () => {
      const mockSummaryAggregation = [
        {
          totalRated: 0,
          thumbsUp: 0,
          thumbsDown: 0,
          upRate: 0,
        },
      ];

      const mockWeeklyAggregation = [];
      const mockTopBadReplies = [];

      repository.aggregate
        .mockResolvedValueOnce(mockSummaryAggregation)
        .mockResolvedValueOnce(mockWeeklyAggregation);
      repository.getFrequentBadBotReplies.mockResolvedValue(mockTopBadReplies);

      const result = await service.botRatingsStats();

      expect(result.summary.totalRated).toBe(0);
      expect(result.summary.thumbsUp).toBe(0);
      expect(result.summary.thumbsDown).toBe(0);
      expect(result.summary.upRate).toBe(0);
      expect(result.weekly).toHaveLength(0);
      expect(result.topBad).toHaveLength(0);
    });

    it('should handle perfect rating (100% thumbs up)', async () => {
      const mockSummaryAggregation = [
        {
          totalRated: 100,
          thumbsUp: 100,
          thumbsDown: 0,
          upRate: 1,
        },
      ];

      const mockWeeklyAggregation = [
        {
          _id: { y: 2024, w: 4 },
          total: 50,
          up: 50,
          down: 0,
        },
        {
          _id: { y: 2024, w: 3 },
          total: 50,
          up: 50,
          down: 0,
        },
      ];

      const mockTopBadReplies = [];

      repository.aggregate
        .mockResolvedValueOnce(mockSummaryAggregation)
        .mockResolvedValueOnce(mockWeeklyAggregation);
      repository.getFrequentBadBotReplies.mockResolvedValue(mockTopBadReplies);

      const result = await service.botRatingsStats();

      expect(result.summary.totalRated).toBe(100);
      expect(result.summary.thumbsUp).toBe(100);
      expect(result.summary.thumbsDown).toBe(0);
      expect(result.summary.upRate).toBeDefined();
      expect(result.weekly).toHaveLength(2);
      expect(result.topBad).toHaveLength(0);
    });

    it('should handle partial date filter (from only)', async () => {
      const from = '2024-01-15';

      const mockSummaryAggregation = [
        {
          totalRated: 75,
          thumbsUp: 60,
          thumbsDown: 15,
          upRate: 0.8,
        },
      ];

      const mockWeeklyAggregation = [
        {
          _id: { y: 2024, w: 3 },
          total: 40,
          up: 32,
          down: 8,
        },
        {
          _id: { y: 2024, w: 2 },
          total: 35,
          up: 28,
          down: 7,
        },
      ];

      const mockTopBadReplies = [
        {
          text: 'الرجاء الانتظار قليلاً',
          count: 12,
          feedbacks: ['بطيء', 'متأخر'],
        },
      ];

      repository.aggregate
        .mockResolvedValueOnce(mockSummaryAggregation)
        .mockResolvedValueOnce(mockWeeklyAggregation);
      repository.getFrequentBadBotReplies.mockResolvedValue(mockTopBadReplies);

      const result = await service.botRatingsStats(from);

      expect(repository.aggregate).toHaveBeenCalledTimes(2);
      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result.summary.totalRated).toBe(75);
      expect(result.summary.thumbsUp).toBe(60);
      expect(result.summary.thumbsDown).toBe(15);
      expect(result.summary.upRate).toBeDefined();
    });

    it('should handle partial date filter (to only)', async () => {
      const to = '2024-01-31';

      const mockSummaryAggregation = [
        {
          totalRated: 60,
          thumbsUp: 48,
          thumbsDown: 12,
          upRate: 0.8,
        },
      ];

      const mockWeeklyAggregation = [
        {
          _id: { y: 2024, w: 1 },
          total: 60,
          up: 48,
          down: 12,
        },
      ];

      const mockTopBadReplies = [
        {
          text: 'حدث خطأ فني',
          count: 10,
          feedbacks: ['خطأ', 'مشكلة تقنية'],
        },
      ];

      repository.aggregate
        .mockResolvedValueOnce(mockSummaryAggregation)
        .mockResolvedValueOnce(mockWeeklyAggregation);
      repository.getFrequentBadBotReplies.mockResolvedValue(mockTopBadReplies);

      const result = await service.botRatingsStats(undefined, to);

      expect(repository.aggregate).toHaveBeenCalledTimes(2);
      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result.summary.totalRated).toBe(60);
      expect(result.summary.thumbsUp).toBe(48);
      expect(result.summary.thumbsDown).toBe(12);
      expect(result.summary.upRate).toBeDefined();
    });
  });

  describe('getTopQuestions', () => {
    it('should return top questions with default limit', async () => {
      const expectedResult = [
        { question: 'كيف حالك؟', count: 15 },
        { question: 'ما هي الخدمات المتاحة؟', count: 12 },
        { question: 'كيف يمكنني التسجيل؟', count: 8 },
      ];

      repository.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await service.getTopQuestions();

      expect(repository.getTopQuestions).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should return top questions with custom limit', async () => {
      const expectedResult = [
        { question: 'كيف حالك؟', count: 15 },
        { question: 'ما هي الخدمات المتاحة؟', count: 12 },
      ];

      repository.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await service.getTopQuestions(5);

      expect(repository.getTopQuestions).toHaveBeenCalledWith(5);
      expect(result).toEqual(expectedResult);
    });

    it('should handle zero results', async () => {
      const expectedResult = [];

      repository.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await service.getTopQuestions(10);

      expect(repository.getTopQuestions).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should handle large limit', async () => {
      const expectedResult = [
        {
          question:
            'سؤال طويل جداً يتكون من عدة كلمات لاختبار الحد الأقصى للطول المسموح به في قاعدة البيانات',
          count: 100,
        },
      ];

      repository.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await service.getTopQuestions(1000);

      expect(repository.getTopQuestions).toHaveBeenCalledWith(1000);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getFrequentBadBotReplies', () => {
    it('should return frequent bad bot replies with default limit', async () => {
      const expectedResult = [
        { text: 'لا أفهم سؤالك', count: 8, feedbacks: ['غير مفيد'] },
        { text: 'يمكنك توضيح المزيد؟', count: 5, feedbacks: ['مكرر'] },
        { text: 'هذا ليس من اختصاصي', count: 3, feedbacks: ['خارج النطاق'] },
      ];

      repository.getFrequentBadBotReplies.mockResolvedValue(expectedResult);

      const result = await service.getFrequentBadBotReplies();

      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should return frequent bad bot replies with custom limit', async () => {
      const expectedResult = [
        { text: 'لا أفهم سؤالك', count: 8, feedbacks: ['غير مفيد'] },
        { text: 'يمكنك توضيح المزيد؟', count: 5, feedbacks: ['مكرر'] },
      ];

      repository.getFrequentBadBotReplies.mockResolvedValue(expectedResult);

      const result = await service.getFrequentBadBotReplies(5);

      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(5);
      expect(result).toEqual(expectedResult);
    });

    it('should handle zero results', async () => {
      const expectedResult = [];

      repository.getFrequentBadBotReplies.mockResolvedValue(expectedResult);

      const result = await service.getFrequentBadBotReplies(10);

      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should handle replies with empty feedbacks array', async () => {
      const expectedResult = [
        { text: 'رد بدون تعليقات', count: 2, feedbacks: [] },
      ];

      repository.getFrequentBadBotReplies.mockResolvedValue(expectedResult);

      const result = await service.getFrequentBadBotReplies(10);

      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should handle large limit', async () => {
      const expectedResult = [
        { text: 'رد واحد فقط', count: 1, feedbacks: ['وحيد'] },
      ];

      repository.getFrequentBadBotReplies.mockResolvedValue(expectedResult);

      const result = await service.getFrequentBadBotReplies(1000);

      expect(repository.getFrequentBadBotReplies).toHaveBeenCalledWith(1000);
      expect(result).toEqual(expectedResult);
    });
  });
});
