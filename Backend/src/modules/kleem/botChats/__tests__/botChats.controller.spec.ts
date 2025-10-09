import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

import { BotChatsController } from '../botChats.controller';
import { BotChatsService } from '../botChats.service';
import { BOT_CHAT_REPOSITORY } from '../tokens';

import type { BotChatRepository } from '../repositories/bot-chats.repository';
import type { TestingModule } from '@nestjs/testing';

describe('BotChatsController', () => {
  let controller: BotChatsController;
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
      controllers: [BotChatsController],
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

    controller = module.get<BotChatsController>(BotChatsController);
    _service = module.get(BotChatsService);
  });

  describe('POST /:sessionId', () => {
    it('should save messages and return session data', async () => {
      const sessionId = 'session_123';
      const messages = [
        {
          role: 'user' as const,
          text: 'مرحباً',
          metadata: {},
        },
      ];

      const expectedResult = {
        _id: '507f1f77bcf86cd799439011' as any,
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

      mockService.createOrAppend.mockResolvedValue(expectedResult);

      const result = await controller.saveMessage(sessionId, { messages });

      expect(mockService.createOrAppend).toHaveBeenCalledWith(
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

      mockService.createOrAppend.mockResolvedValue(expectedResult);

      const result = await controller.saveMessage(sessionId, { messages });

      expect(mockService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messages,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle multiple messages in one request', async () => {
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

      mockService.createOrAppend.mockResolvedValue(expectedResult);

      const result = await controller.saveMessage(sessionId, { messages });

      expect(mockService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messages,
      );
      expect(result).toEqual(expectedResult);
    });
  });

  describe('PATCH /:sessionId/rate/:msgIdx', () => {
    it('should rate a message with thumbs up', async () => {
      const sessionId = 'session_123';
      const msgIdx = '0';
      const ratingData = {
        rating: 1 as const,
        feedback: 'كان الرد مفيداً جداً',
      };

      mockService.rateMessage.mockResolvedValue({ status: 'ok' });

      const result = await controller.rateMessage(
        sessionId,
        msgIdx,
        ratingData,
      );

      expect(mockService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        0,
        1,
        'كان الرد مفيداً جداً',
      );
      expect(result).toEqual({ status: 'ok' });
    });

    it('should rate a message with thumbs down', async () => {
      const sessionId = 'session_456';
      const msgIdx = '2';
      const ratingData = {
        rating: 0 as const,
        feedback: 'الرد لم يكن دقيقاً',
      };

      mockService.rateMessage.mockResolvedValue({ status: 'ok' });

      const result = await controller.rateMessage(
        sessionId,
        msgIdx,
        ratingData,
      );

      expect(mockService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        2,
        0,
        'الرد لم يكن دقيقاً',
      );
      expect(result).toEqual({ status: 'ok' });
    });

    it('should rate a message without feedback', async () => {
      const sessionId = 'session_789';
      const msgIdx = '1';
      const ratingData = {
        rating: 1 as const,
      };

      mockService.rateMessage.mockResolvedValue({ status: 'ok' });

      const result = await controller.rateMessage(
        sessionId,
        msgIdx,
        ratingData,
      );

      expect(mockService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        1,
        1,
        undefined,
      );
      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('GET /:sessionId', () => {
    it('should return session data', async () => {
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

      mockService.findBySession.mockResolvedValue(expectedResult);

      const result = await controller.getSession(sessionId);

      expect(mockService.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(expectedResult);
    });

    it('should return null if session not found', async () => {
      const sessionId = 'nonexistent_session';

      mockService.findBySession.mockResolvedValue(null);

      const result = await controller.getSession(sessionId);

      expect(mockService.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toBeNull();
    });
  });

  describe('GET / (list)', () => {
    it('should return paginated chat sessions with default values', async () => {
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

      mockService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.list('1', '20', undefined);

      expect(mockService.findAll).toHaveBeenCalledWith(1, 20, undefined);
      expect(result).toEqual(expectedResult);
    });

    it('should return paginated chat sessions with custom pagination', async () => {
      const expectedResult = {
        data: [],
        total: 0,
      };

      mockService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.list('3', '50', 'test search');

      expect(mockService.findAll).toHaveBeenCalledWith(3, 50, 'test search');
      expect(result).toEqual(expectedResult);
    });

    it('should handle string pagination parameters', async () => {
      const expectedResult = {
        data: [],
        total: 0,
      };

      mockService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.list('2', '15', '');

      expect(mockService.findAll).toHaveBeenCalledWith(2, 15, '');
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET /stats/top-questions/list', () => {
    it('should return top questions with default limit', async () => {
      const expectedResult = [
        { question: 'كيف حالك؟', count: 15 },
        { question: 'ما هي الخدمات المتاحة؟', count: 12 },
      ];

      mockService.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await controller.topQuestions(undefined);

      expect(mockService.getTopQuestions).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should return top questions with custom limit', async () => {
      const expectedResult = [{ question: 'كيف حالك؟', count: 15 }];

      mockService.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await controller.topQuestions('5');

      expect(mockService.getTopQuestions).toHaveBeenCalledWith(5);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET /stats/bad-bot-replies/list', () => {
    it('should return bad bot replies with default limit', async () => {
      const expectedResult = [
        { text: 'لا أفهم سؤالك', count: 8, feedbacks: ['غير مفيد'] },
        { text: 'يمكنك توضيح المزيد؟', count: 5, feedbacks: ['مكرر'] },
      ];

      mockService.getFrequentBadBotReplies.mockResolvedValue(expectedResult);

      const result = await controller.badReplies(undefined);

      expect(mockService.getFrequentBadBotReplies).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should return bad bot replies with custom limit', async () => {
      const expectedResult = [
        { text: 'لا أفهم سؤالك', count: 8, feedbacks: ['غير مفيد'] },
      ];

      mockService.getFrequentBadBotReplies.mockResolvedValue(expectedResult);

      const result = await controller.badReplies('3');

      expect(mockService.getFrequentBadBotReplies).toHaveBeenCalledWith(3);
      expect(result).toEqual(expectedResult);
    });
  });
});
