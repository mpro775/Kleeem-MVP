import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { BotChatsAdminController } from '../botChats.admin.controller';
import { BotChatsService } from '../botChats.service';
import { QueryBotRatingsDto } from '../dto/query-bot-ratings.dto';
import { BOT_CHAT_REPOSITORY } from '../tokens';

import type { BotChatRepository } from '../repositories/bot-chats.repository';
import type { TestingModule } from '@nestjs/testing';

describe('BotChatsAdminController', () => {
  let controller: BotChatsAdminController;
  let _service: jest.Mocked<BotChatsService>;

  const mockService = {
    createOrAppend: jest.fn(),
    rateMessage: jest.fn(),
    findBySession: jest.fn(),
    findAll: jest.fn(),
    listBotRatings: jest.fn(),
    botRatingsStats: jest.fn(),
    getTopQuestions: jest.fn(),
    getFrequentBadBotReplies: jest.fn(),
  } as any;

  const mockRepository: jest.Mocked<BotChatRepository> = {
    createOrAppend: jest.fn(),
    rateMessage: jest.fn(),
    findBySession: jest.fn(),
    findAll: jest.fn(),
    aggregate: jest.fn(),
    getFrequentBadBotReplies: jest.fn(),
    getTopQuestions: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotChatsAdminController],
      providers: [
        {
          provide: BotChatsService,
          useValue: mockService,
        },
        {
          provide: BOT_CHAT_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: jest.fn(() => true),
      })
      .compile();

    controller = module.get<BotChatsAdminController>(BotChatsAdminController);
    _service = module.get(BotChatsService);
  });

  describe('GET / (list)', () => {
    it('should return paginated bot ratings with default query', async () => {
      const query = new QueryBotRatingsDto();
      query.page = 1;
      query.limit = 20;

      const expectedResult = {
        items: [
          {
            id: '507f1f77bcf86cd799439011:2024-01-15T10:30:00.000Z',
            sessionId: 'session_123',
            updatedAt: new Date('2024-01-15T10:30:00.000Z'),
            message: 'مرحباً، كيف يمكنني مساعدتك؟',
            rating: 1 as 0 | 1,
            feedback: 'كان الرد مفيداً',
            timestamp: new Date('2024-01-15T10:30:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should return paginated bot ratings with custom query parameters', async () => {
      const query = new QueryBotRatingsDto();
      query.rating = '0'; // thumbs down only
      query.q = 'غير مفيد';
      query.sessionId = 'session_456';
      query.from = '2024-01-01';
      query.to = '2024-12-31';
      query.page = 2;
      query.limit = 50;

      const expectedResult = {
        items: [
          {
            id: '507f1f77bcf86cd799439012:2024-01-16T14:20:00.000Z',
            sessionId: 'session_456',
            updatedAt: new Date('2024-01-16T14:20:00.000Z'),
            message: 'لا أفهم سؤالك جيداً',
            rating: 0 as 0 | 1,
            feedback: 'غير مفيد',
            timestamp: new Date('2024-01-16T14:20:00.000Z'),
          },
        ],
        total: 1,
        page: 2,
        limit: 50,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty results', async () => {
      const query = new QueryBotRatingsDto();
      query.rating = '1';
      query.page = 1;
      query.limit = 20;

      const expectedResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should handle query with only rating filter', async () => {
      const query = new QueryBotRatingsDto();
      query.rating = '0'; // thumbs down only

      const expectedResult = {
        items: [
          {
            id: '507f1f77bcf86cd799439013:2024-01-17T09:15:00.000Z',
            sessionId: 'session_789',
            updatedAt: new Date('2024-01-17T09:15:00.000Z'),
            message: 'هذا ليس ما أبحث عنه',
            rating: 0 as 0 | 1,
            timestamp: new Date('2024-01-17T09:15:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should handle query with search term', async () => {
      const query = new QueryBotRatingsDto();
      query.q = 'مساعدة';

      const expectedResult = {
        items: [
          {
            id: '507f1f77bcf86cd799439014:2024-01-18T16:45:00.000Z',
            sessionId: 'session_101',
            updatedAt: new Date('2024-01-18T16:45:00.000Z'),
            message: 'أحتاج مساعدة في هذا الأمر',
            rating: 1 as 0 | 1,
            feedback: 'سريع الاستجابة',
            timestamp: new Date('2024-01-18T16:45:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should handle query with session filter', async () => {
      const query = new QueryBotRatingsDto();
      query.sessionId = 'specific_session_123';

      const expectedResult = {
        items: [
          {
            id: '507f1f77bcf86cd799439015:2024-01-19T11:30:00.000Z',
            sessionId: 'specific_session_123',
            updatedAt: new Date('2024-01-19T11:30:00.000Z'),
            message: 'رد جيد على سؤال محدد',
            rating: 1 as 0 | 1,
            timestamp: new Date('2024-01-19T11:30:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should handle query with date range', async () => {
      const query = new QueryBotRatingsDto();
      query.from = '2024-01-01';
      query.to = '2024-01-31';

      const expectedResult = {
        items: [
          {
            id: '507f1f77bcf86cd799439016:2024-01-20T08:00:00.000Z',
            sessionId: 'session_2024',
            updatedAt: new Date('2024-01-20T08:00:00.000Z'),
            message: 'رد خلال شهر يناير',
            rating: 1 as 0 | 1,
            timestamp: new Date('2024-01-20T08:00:00.000Z'),
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });

    it('should handle large page numbers', async () => {
      const query = new QueryBotRatingsDto();
      query.page = 100;
      query.limit = 50;

      const expectedResult = {
        items: [],
        total: 0,
        page: 100,
        limit: 50,
      };

      mockService.listBotRatings.mockResolvedValue(expectedResult);

      const result = await controller.list(query);

      expect(mockService.listBotRatings).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET /stats', () => {
    it('should return bot ratings statistics without date filter', async () => {
      const expectedResult = {
        summary: {
          totalRated: 150,
          thumbsUp: 120,
          thumbsDown: 30,
          upRate: 0.8,
        },
        weekly: [
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
        ],
        topBad: [
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
        ],
      };

      mockService.botRatingsStats.mockResolvedValue(expectedResult);

      const result = await controller.stats(undefined, undefined);

      expect(mockService.botRatingsStats).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should return bot ratings statistics with date filter', async () => {
      const from = '2024-01-01';
      const to = '2024-01-31';

      const expectedResult = {
        summary: {
          totalRated: 45,
          thumbsUp: 35,
          thumbsDown: 10,
          upRate: 0.777,
        },
        weekly: [
          {
            _id: { y: 2024, w: 1 },
            total: 45,
            up: 35,
            down: 10,
          },
        ],
        topBad: [
          {
            text: 'لا أستطيع مساعدتك في هذا',
            count: 8,
            feedbacks: ['خارج النطاق', 'غير متاح'],
          },
        ],
      };

      mockService.botRatingsStats.mockResolvedValue(expectedResult);

      const result = await controller.stats(from, to);

      expect(mockService.botRatingsStats).toHaveBeenCalledWith(from, to);
      expect(result).toEqual(expectedResult);
    });

    it('should handle empty statistics result', async () => {
      const expectedResult = {
        summary: {
          totalRated: 0,
          thumbsUp: 0,
          thumbsDown: 0,
          upRate: 0,
        },
        weekly: [],
        topBad: [],
      };

      mockService.botRatingsStats.mockResolvedValue(expectedResult);

      const result = await controller.stats(undefined, undefined);

      expect(mockService.botRatingsStats).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle partial date filter (from only)', async () => {
      const from = '2024-01-15';

      const expectedResult = {
        summary: {
          totalRated: 75,
          thumbsUp: 60,
          thumbsDown: 15,
          upRate: 0.8,
        },
        weekly: [
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
        ],
        topBad: [
          {
            text: 'الرجاء الانتظار قليلاً',
            count: 12,
            feedbacks: ['بطيء', 'متأخر'],
          },
        ],
      };

      mockService.botRatingsStats.mockResolvedValue(expectedResult);

      const result = await controller.stats(from, undefined);

      expect(mockService.botRatingsStats).toHaveBeenCalledWith(from, undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should handle partial date filter (to only)', async () => {
      const to = '2024-01-31';

      const expectedResult = {
        summary: {
          totalRated: 60,
          thumbsUp: 48,
          thumbsDown: 12,
          upRate: 0.8,
        },
        weekly: [
          {
            _id: { y: 2024, w: 1 },
            total: 60,
            up: 48,
            down: 12,
          },
        ],
        topBad: [
          {
            text: 'حدث خطأ فني',
            count: 10,
            feedbacks: ['خطأ', 'مشكلة تقنية'],
          },
        ],
      };

      mockService.botRatingsStats.mockResolvedValue(expectedResult);

      const result = await controller.stats(undefined, to);

      expect(mockService.botRatingsStats).toHaveBeenCalledWith(undefined, to);
      expect(result).toEqual(expectedResult);
    });

    it('should handle statistics with perfect rating (100% thumbs up)', async () => {
      const expectedResult = {
        summary: {
          totalRated: 100,
          thumbsUp: 100,
          thumbsDown: 0,
          upRate: 1,
        },
        weekly: [
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
        ],
        topBad: [],
      };

      mockService.botRatingsStats.mockResolvedValue(expectedResult);

      const result = await controller.stats(undefined, undefined);

      expect(mockService.botRatingsStats).toHaveBeenCalledWith(
        undefined,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle statistics with zero ratings', async () => {
      const expectedResult = {
        summary: {
          totalRated: 0,
          thumbsUp: 0,
          thumbsDown: 0,
          upRate: 0,
        },
        weekly: [],
        topBad: [],
      };

      mockService.botRatingsStats.mockResolvedValue(expectedResult);

      const result = await controller.stats('2024-01-01', '2024-01-31');

      expect(mockService.botRatingsStats).toHaveBeenCalledWith(
        '2024-01-01',
        '2024-01-31',
      );
      expect(result).toEqual(expectedResult);
    });
  });
});
