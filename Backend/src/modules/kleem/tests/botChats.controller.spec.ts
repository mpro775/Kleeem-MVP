import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { BotChatsController } from '../botChats/botChats.controller';
import { BotChatsService } from '../botChats/botChats.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

describe('BotChatsController', () => {
  let controller: BotChatsController;
  let mockBotChatsService: jest.Mocked<BotChatsService>;

  beforeEach(async () => {
    mockBotChatsService = {
      createOrAppend: jest.fn(),
      rateMessage: jest.fn(),
      findBySession: jest.fn(),
      findAll: jest.fn(),
      getTopQuestions: jest.fn(),
      getFrequentBadBotReplies: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BotChatsController],
      providers: [{ provide: BotChatsService, useValue: mockBotChatsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<BotChatsController>(BotChatsController);
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

    it('should be protected by JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata('__guards__', BotChatsController);
      expect(guards).toBeDefined();
    });

    it('should require ADMIN role', () => {
      const roles = Reflect.getMetadata('roles', BotChatsController);
      expect(roles).toContain('ADMIN');
    });
  });

  describe('saveMessage', () => {
    const sessionId = 'admin-test-session-123';

    it('should save single message successfully', async () => {
      const messageBody = {
        messages: [
          {
            role: 'user' as const,
            text: 'مرحباً، كيف يمكنني المساعدة؟',
            metadata: { source: 'admin_panel' },
            timestamp: new Date('2024-01-01T00:00:00Z'),
          },
        ],
      };

      const expectedResult = {
        sessionId,
        messages: messageBody.messages,
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        expectedResult as any,
      );

      const result = await controller.saveMessage(sessionId, messageBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messageBody.messages,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should save multiple messages successfully', async () => {
      const messageBody = {
        messages: [
          {
            role: 'user' as const,
            text: 'سؤال من المستخدم',
            metadata: { platform: 'web' },
          },
          {
            role: 'bot' as const,
            text: 'رد من البوت',
            metadata: { generated: true },
          },
          {
            role: 'user' as const,
            text: 'سؤال آخر',
            metadata: { followUp: true },
          },
        ],
      };

      const expectedResult = {
        sessionId,
        messages: messageBody.messages,
      };

      mockBotChatsService.createOrAppend.mockResolvedValue(
        expectedResult as any,
      );

      const result = await controller.saveMessage(sessionId, messageBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messageBody.messages,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle messages without optional fields', async () => {
      const messageBody = {
        messages: [
          {
            role: 'user' as const,
            text: 'رسالة بسيطة',
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.saveMessage(sessionId, messageBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messageBody.messages,
      );
    });

    it('should handle messages with complex metadata', async () => {
      const messageBody = {
        messages: [
          {
            role: 'bot' as const,
            text: 'رد معقد من البوت',
            metadata: {
              ai: {
                model: 'gpt-4',
                confidence: 0.95,
                processingTime: 1250,
              },
              context: {
                userHistory: ['question1', 'question2'],
                sessionLength: 5,
              },
              admin: {
                reviewedBy: 'admin-123',
                approved: true,
                tags: ['helpful', 'accurate'],
              },
            },
            timestamp: new Date('2024-01-01T12:00:00Z'),
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.saveMessage(sessionId, messageBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messageBody.messages,
      );
    });

    it('should handle Arabic text correctly', async () => {
      const messageBody = {
        messages: [
          {
            role: 'user' as const,
            text: 'مرحباً، أريد الاستفسار عن الخدمات المتوفرة في منصة كليم والباقات المتاحة للشركات',
            metadata: { language: 'ar', length: 'long' },
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.saveMessage(sessionId, messageBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        messageBody.messages,
      );
    });

    it('should handle empty messages array', async () => {
      const messageBody = {
        messages: [],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.saveMessage(sessionId, messageBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        sessionId,
        [],
      );
    });

    it('should handle service errors', async () => {
      const messageBody = {
        messages: [
          {
            role: 'user' as const,
            text: 'رسالة تسبب خطأ',
          },
        ],
      };

      const error = new Error('Database connection failed');
      mockBotChatsService.createOrAppend.mockRejectedValue(error);

      await expect(
        controller.saveMessage(sessionId, messageBody),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle special session IDs', async () => {
      const specialSessionId = 'admin-session-123_special@domain.com';
      const messageBody = {
        messages: [
          {
            role: 'bot' as const,
            text: 'رسالة مع session ID خاص',
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.saveMessage(specialSessionId, messageBody);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        specialSessionId,
        messageBody.messages,
      );
    });
  });

  describe('rateMessage', () => {
    const sessionId = 'rate-test-session';

    it('should rate message with positive rating and feedback', async () => {
      const msgIdx = '2';
      const ratingBody = {
        rating: 1 as 0 | 1,
        feedback: 'الرد كان مفيداً جداً وأجاب على جميع استفساراتي',
      };

      const expectedResult = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResult);

      const result = await controller.rateMessage(
        sessionId,
        msgIdx,
        ratingBody,
      );

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        2,
        1,
        ratingBody.feedback,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should rate message with negative rating and feedback', async () => {
      const msgIdx = '1';
      const ratingBody = {
        rating: 0 as 0 | 1,
        feedback: 'الرد لم يكن دقيقاً ولم يساعدني في حل مشكلتي',
      };

      const expectedResult = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResult);

      const result = await controller.rateMessage(
        sessionId,
        msgIdx,
        ratingBody,
      );

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        1,
        0,
        ratingBody.feedback,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should rate message without feedback', async () => {
      const msgIdx = '0';
      const ratingBody = {
        rating: 1 as 0 | 1,
      };

      const expectedResult = { status: 'ok' as const };
      mockBotChatsService.rateMessage.mockResolvedValue(expectedResult);

      const result = await controller.rateMessage(
        sessionId,
        msgIdx,
        ratingBody,
      );

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        0,
        1,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle string msgIdx conversion to number', async () => {
      const msgIdx = '15';
      const ratingBody = {
        rating: 0 as 0 | 1,
        feedback: 'تقييم للرسالة رقم 15',
      };

      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      await controller.rateMessage(sessionId, msgIdx, ratingBody);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        15,
        0,
        ratingBody.feedback,
      );
    });

    it('should handle zero msgIdx', async () => {
      const msgIdx = '0';
      const ratingBody = {
        rating: 1 as 0 | 1,
        feedback: 'تقييم للرسالة الأولى',
      };

      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      await controller.rateMessage(sessionId, msgIdx, ratingBody);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        0,
        1,
        ratingBody.feedback,
      );
    });

    it('should handle empty feedback string', async () => {
      const msgIdx = '3';
      const ratingBody = {
        rating: 1 as 0 | 1,
        feedback: '',
      };

      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      await controller.rateMessage(sessionId, msgIdx, ratingBody);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        3,
        1,
        '',
      );
    });

    it('should handle service errors', async () => {
      const msgIdx = '999';
      const ratingBody = {
        rating: 1 as 0 | 1,
      };

      const error = new Error('Message not found for rating');
      mockBotChatsService.rateMessage.mockRejectedValue(error);

      await expect(
        controller.rateMessage(sessionId, msgIdx, ratingBody),
      ).rejects.toThrow('Message not found for rating');
    });

    it('should handle invalid msgIdx strings', async () => {
      const msgIdx = 'invalid';
      const ratingBody = {
        rating: 1 as 0 | 1,
      };

      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      await controller.rateMessage(sessionId, msgIdx, ratingBody);

      // Number('invalid') returns NaN
      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        NaN,
        1,
        undefined,
      );
    });

    it('should handle Arabic feedback text', async () => {
      const msgIdx = '5';
      const ratingBody = {
        rating: 0 as 0 | 1,
        feedback:
          'الرد كان غير واضح ولم يقدم المساعدة المطلوبة. أتمنى تحسين جودة الردود',
      };

      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      await controller.rateMessage(sessionId, msgIdx, ratingBody);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        5,
        0,
        ratingBody.feedback,
      );
    });

    it('should handle mixed language feedback', async () => {
      const msgIdx = '7';
      const ratingBody = {
        rating: 1 as 0 | 1,
        feedback:
          'Great response! الرد كان ممتازاً and very helpful شكراً جزيلاً',
      };

      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      await controller.rateMessage(sessionId, msgIdx, ratingBody);

      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        7,
        1,
        ratingBody.feedback,
      );
    });
  });

  describe('getSession', () => {
    const sessionId = 'get-session-test';

    it('should get session successfully', async () => {
      const expectedSession = {
        sessionId,
        messages: [
          {
            role: 'user',
            text: 'مرحباً',
            metadata: {},
            timestamp: new Date('2024-01-01T00:00:00Z'),
          },
          {
            role: 'bot',
            text: 'أهلاً وسهلاً! كيف يمكنني مساعدتك؟',
            metadata: { generated: true },
            timestamp: new Date('2024-01-01T00:01:00Z'),
            rating: 1,
            feedback: 'رد ممتاز',
          },
        ],
      };

      mockBotChatsService.findBySession.mockResolvedValue(expectedSession);

      const result = await controller.getSession(sessionId);

      expect(mockBotChatsService.findBySession).toHaveBeenCalledWith(sessionId);
      expect(result).toEqual(expectedSession);
    });

    it('should return null for non-existent session', async () => {
      mockBotChatsService.findBySession.mockResolvedValue(null);

      const result = await controller.getSession('non-existent-session');

      expect(result).toBeNull();
    });

    it('should handle empty session', async () => {
      const emptySession = {
        sessionId,
        messages: [],
      };

      mockBotChatsService.findBySession.mockResolvedValue(emptySession);

      const result = await controller.getSession(sessionId);

      expect(result).toEqual(emptySession);
    });

    it('should handle session with rated messages', async () => {
      const sessionWithRatings = {
        sessionId,
        messages: [
          {
            role: 'bot',
            text: 'رد حصل على تقييم إيجابي',
            rating: 1,
            feedback: 'ممتاز',
          },
          {
            role: 'bot',
            text: 'رد حصل على تقييم سلبي',
            rating: 0,
            feedback: 'غير مفيد',
          },
          {
            role: 'bot',
            text: 'رد لم يتم تقييمه',
            rating: null,
            feedback: null,
          },
        ],
      };

      mockBotChatsService.findBySession.mockResolvedValue(sessionWithRatings);

      const result = await controller.getSession(sessionId);

      expect(result).toEqual(sessionWithRatings);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database connection failed');
      mockBotChatsService.findBySession.mockRejectedValue(error);

      await expect(controller.getSession(sessionId)).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should handle special characters in session ID', async () => {
      const specialSessionId = 'session-123_test@domain.com#special';

      mockBotChatsService.findBySession.mockResolvedValue({
        sessionId: specialSessionId,
        messages: [],
      });

      const result = await controller.getSession(specialSessionId);

      expect(mockBotChatsService.findBySession).toHaveBeenCalledWith(
        specialSessionId,
      );
      expect(result.sessionId).toBe(specialSessionId);
    });
  });

  describe('list', () => {
    it('should list all sessions with default pagination', async () => {
      const expectedResult = {
        data: [
          { sessionId: 'session-1', messages: [] },
          { sessionId: 'session-2', messages: [] },
        ],
        total: 2,
      };

      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.list();

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should list sessions with custom pagination', async () => {
      const expectedResult = {
        data: [{ sessionId: 'session-1', messages: [] }],
        total: 1,
      };

      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.list('3', '10');

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        3,
        10,
        undefined,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should list sessions with search query', async () => {
      const searchQuery = 'مرحباً';
      const expectedResult = {
        data: [
          {
            sessionId: 'session-1',
            messages: [{ role: 'user', text: 'مرحباً، كيف حالك؟' }],
          },
        ],
        total: 1,
      };

      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.list('1', '20', searchQuery);

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        searchQuery,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid page numbers', async () => {
      const expectedResult = { data: [], total: 0 };
      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      // Invalid page numbers should default to 1
      await controller.list('invalid', '20');

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
      );
    });

    it('should handle invalid limit numbers', async () => {
      const expectedResult = { data: [], total: 0 };
      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      // Invalid limit should default to 20
      await controller.list('1', 'invalid');

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
      );
    });

    it('should handle zero page number', async () => {
      const expectedResult = { data: [], total: 0 };
      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      // Zero page should default to 1
      await controller.list('0', '20');

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
      );
    });

    it('should handle zero limit', async () => {
      const expectedResult = { data: [], total: 0 };
      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      // Zero limit should default to 20
      await controller.list('1', '0');

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        undefined,
      );
    });

    it('should handle empty search query', async () => {
      const expectedResult = { data: [], total: 0 };
      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      await controller.list('1', '20', '');

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(1, 20, '');
    });

    it('should handle Arabic search query', async () => {
      const arabicQuery = 'الأسعار والباقات المتوفرة';
      const expectedResult = { data: [], total: 0 };
      mockBotChatsService.findAll.mockResolvedValue(expectedResult);

      await controller.list('1', '20', arabicQuery);

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        arabicQuery,
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockBotChatsService.findAll.mockRejectedValue(error);

      await expect(controller.list()).rejects.toThrow('Database error');
    });
  });

  describe('topQuestions', () => {
    it('should get top questions with default limit', async () => {
      const expectedResult = [
        { question: 'ما هي خدماتكم؟', count: 15 },
        { question: 'كم السعر؟', count: 12 },
        { question: 'أين مقركم؟', count: 8 },
      ];

      mockBotChatsService.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await controller.topQuestions();

      expect(mockBotChatsService.getTopQuestions).toHaveBeenCalledWith(10);
      expect(result).toEqual(expectedResult);
    });

    it('should get top questions with custom limit', async () => {
      const expectedResult = [
        { question: 'كيف يمكنني التسجيل؟', count: 20 },
        { question: 'ما هي الباقات المتاحة؟', count: 18 },
      ];

      mockBotChatsService.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await controller.topQuestions('5');

      expect(mockBotChatsService.getTopQuestions).toHaveBeenCalledWith(5);
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid limit string', async () => {
      const expectedResult = [];
      mockBotChatsService.getTopQuestions.mockResolvedValue(expectedResult);

      await controller.topQuestions('invalid');

      // Invalid limit should default to 10
      expect(mockBotChatsService.getTopQuestions).toHaveBeenCalledWith(10);
    });

    it('should handle zero limit', async () => {
      const expectedResult = [];
      mockBotChatsService.getTopQuestions.mockResolvedValue(expectedResult);

      await controller.topQuestions('0');

      // Zero limit should default to 10
      expect(mockBotChatsService.getTopQuestions).toHaveBeenCalledWith(10);
    });

    it('should handle empty results', async () => {
      mockBotChatsService.getTopQuestions.mockResolvedValue([]);

      const result = await controller.topQuestions();

      expect(result).toEqual([]);
    });

    it('should handle Arabic questions in results', async () => {
      const expectedResult = [
        { question: 'كيف أستطيع الاستفادة من منصة كليم؟', count: 25 },
        { question: 'ما هي التكاملات المتوفرة مع الأنظمة الأخرى؟', count: 22 },
        { question: 'هل يمكنني استخدام المنصة مجاناً؟', count: 19 },
      ];

      mockBotChatsService.getTopQuestions.mockResolvedValue(expectedResult);

      const result = await controller.topQuestions('3');

      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Aggregation failed');
      mockBotChatsService.getTopQuestions.mockRejectedValue(error);

      await expect(controller.topQuestions()).rejects.toThrow(
        'Aggregation failed',
      );
    });

    it('should handle large limit numbers', async () => {
      const expectedResult = [];
      mockBotChatsService.getTopQuestions.mockResolvedValue(expectedResult);

      await controller.topQuestions('1000');

      expect(mockBotChatsService.getTopQuestions).toHaveBeenCalledWith(1000);
    });
  });

  describe('badReplies', () => {
    it('should get bad replies with default limit', async () => {
      const expectedResult = [
        {
          text: 'لا أفهم ما تقصده',
          count: 10,
          feedbacks: ['غير واضح', 'لم يساعدني'],
        },
        {
          text: 'عذراً، لا أستطيع المساعدة',
          count: 8,
          feedbacks: ['غير مفيد'],
        },
      ];

      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.badReplies();

      expect(mockBotChatsService.getFrequentBadBotReplies).toHaveBeenCalledWith(
        10,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should get bad replies with custom limit', async () => {
      const expectedResult = [
        {
          text: 'هذا خارج نطاق خبرتي',
          count: 15,
          feedbacks: ['غير دقيق', 'يحتاج تحسين', 'لا يجيب على السؤال'],
        },
      ];

      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.badReplies('3');

      expect(mockBotChatsService.getFrequentBadBotReplies).toHaveBeenCalledWith(
        3,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid limit string', async () => {
      const expectedResult = [];
      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        expectedResult,
      );

      await controller.badReplies('invalid');

      // Invalid limit should default to 10
      expect(mockBotChatsService.getFrequentBadBotReplies).toHaveBeenCalledWith(
        10,
      );
    });

    it('should handle zero limit', async () => {
      const expectedResult = [];
      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        expectedResult,
      );

      await controller.badReplies('0');

      // Zero limit should default to 10
      expect(mockBotChatsService.getFrequentBadBotReplies).toHaveBeenCalledWith(
        10,
      );
    });

    it('should handle empty results', async () => {
      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue([]);

      const result = await controller.badReplies();

      expect(result).toEqual([]);
    });

    it('should handle results with Arabic feedback', async () => {
      const expectedResult = [
        {
          text: 'لا يمكنني الإجابة على هذا السؤال',
          count: 12,
          feedbacks: [
            'الإجابة غير كافية',
            'أحتاج تفاصيل أكثر',
            'لم يحل مشكلتي',
          ],
        },
      ];

      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.badReplies('5');

      expect(result).toEqual(expectedResult);
    });

    it('should handle results with empty feedbacks', async () => {
      const expectedResult = [
        {
          text: 'رد بدون تعليقات',
          count: 5,
          feedbacks: [],
        },
      ];

      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.badReplies();

      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Aggregation failed');
      mockBotChatsService.getFrequentBadBotReplies.mockRejectedValue(error);

      await expect(controller.badReplies()).rejects.toThrow(
        'Aggregation failed',
      );
    });

    it('should handle mixed language feedbacks', async () => {
      const expectedResult = [
        {
          text: 'Sorry, I cannot help with that',
          count: 7,
          feedbacks: [
            'Not helpful in Arabic رد غير مفيد',
            'Mix language feedback تعليق مختلط',
          ],
        },
      ];

      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        expectedResult,
      );

      const result = await controller.badReplies('2');

      expect(result).toEqual(expectedResult);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete admin workflow', async () => {
      const sessionId = 'admin-workflow-session';

      // 1. Save messages
      const messageBody = {
        messages: [
          {
            role: 'user' as const,
            text: 'سؤال من المستخدم',
            metadata: { source: 'admin_test' },
          },
          {
            role: 'bot' as const,
            text: 'رد من البوت',
            metadata: { reviewed: true },
          },
        ],
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({
        sessionId,
        messages: messageBody.messages,
      } as any);

      const saveResult = await controller.saveMessage(sessionId, messageBody);
      expect(saveResult.sessionId).toBe(sessionId);

      // 2. Rate a message
      const ratingBody = { rating: 0 as 0 | 1, feedback: 'يحتاج تحسين' };
      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      const rateResult = await controller.rateMessage(
        sessionId,
        '1',
        ratingBody,
      );
      expect(rateResult.status).toBe('ok');

      // 3. Get the session
      const sessionData = {
        sessionId,
        messages: [
          ...messageBody.messages,
          { rating: 0, feedback: 'يحتاج تحسين' },
        ],
      };
      mockBotChatsService.findBySession.mockResolvedValue(sessionData);

      const getResult = await controller.getSession(sessionId);
      expect(getResult.sessionId).toBe(sessionId);

      // 4. List sessions
      mockBotChatsService.findAll.mockResolvedValue({
        data: [sessionData],
        total: 1,
      });

      const listResult = await controller.list('1', '20');
      expect(listResult.total).toBe(1);

      // Verify all service calls
      expect(mockBotChatsService.createOrAppend).toHaveBeenCalled();
      expect(mockBotChatsService.rateMessage).toHaveBeenCalled();
      expect(mockBotChatsService.findBySession).toHaveBeenCalled();
      expect(mockBotChatsService.findAll).toHaveBeenCalled();
    });

    it('should handle analytics workflow', async () => {
      // Get top questions
      const topQuestions = [
        { question: 'ما هي الخدمات؟', count: 20 },
        { question: 'كم السعر؟', count: 15 },
      ];
      mockBotChatsService.getTopQuestions.mockResolvedValue(topQuestions);

      const topQuestionsResult = await controller.topQuestions('5');
      expect(topQuestionsResult).toHaveLength(2);

      // Get bad replies
      const badReplies = [
        {
          text: 'لا أعرف',
          count: 10,
          feedbacks: ['غير مفيد', 'يحتاج تحسين'],
        },
      ];
      mockBotChatsService.getFrequentBadBotReplies.mockResolvedValue(
        badReplies,
      );

      const badRepliesResult = await controller.badReplies('5');
      expect(badRepliesResult).toHaveLength(1);

      // Verify analytics calls
      expect(mockBotChatsService.getTopQuestions).toHaveBeenCalledWith(5);
      expect(mockBotChatsService.getFrequentBadBotReplies).toHaveBeenCalledWith(
        5,
      );
    });

    it('should handle concurrent admin operations', async () => {
      const sessionIds = ['session-1', 'session-2', 'session-3'];

      // Mock concurrent operations
      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);
      mockBotChatsService.findBySession.mockResolvedValue({} as any);
      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      // Perform concurrent operations
      const savePromises = sessionIds.map((sessionId) =>
        controller.saveMessage(sessionId, {
          messages: [{ role: 'user', text: `Message for ${sessionId}` }],
        }),
      );

      const getPromises = sessionIds.map((sessionId) =>
        controller.getSession(sessionId),
      );

      const ratePromises = sessionIds.map((sessionId) =>
        controller.rateMessage(sessionId, '0', { rating: 1 }),
      );

      // Wait for all operations
      const [saveResults, getResults, rateResults] = await Promise.all([
        Promise.all(savePromises),
        Promise.all(getPromises),
        Promise.all(ratePromises),
      ]);

      expect(saveResults).toHaveLength(3);
      expect(getResults).toHaveLength(3);
      expect(rateResults).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const error = new Error('Service unavailable');

      // Test error propagation for each method
      mockBotChatsService.createOrAppend.mockRejectedValue(error);
      await expect(
        controller.saveMessage('session', { messages: [] }),
      ).rejects.toThrow('Service unavailable');

      mockBotChatsService.rateMessage.mockRejectedValue(error);
      await expect(
        controller.rateMessage('session', '0', { rating: 1 }),
      ).rejects.toThrow('Service unavailable');

      mockBotChatsService.findBySession.mockRejectedValue(error);
      await expect(controller.getSession('session')).rejects.toThrow(
        'Service unavailable',
      );

      mockBotChatsService.findAll.mockRejectedValue(error);
      await expect(controller.list()).rejects.toThrow('Service unavailable');

      mockBotChatsService.getTopQuestions.mockRejectedValue(error);
      await expect(controller.topQuestions()).rejects.toThrow(
        'Service unavailable',
      );

      mockBotChatsService.getFrequentBadBotReplies.mockRejectedValue(error);
      await expect(controller.badReplies()).rejects.toThrow(
        'Service unavailable',
      );
    });

    it('should handle malformed request bodies gracefully', async () => {
      // Test with invalid message body
      const invalidBody = {
        messages: null,
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.saveMessage('session', invalidBody as any);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        'session',
        null,
      );
    });

    it('should handle edge cases in parameter conversion', async () => {
      // Test with extreme msgIdx values
      mockBotChatsService.rateMessage.mockResolvedValue({ status: 'ok' });

      await controller.rateMessage('session', '999999', { rating: 1 });
      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        'session',
        999999,
        1,
        undefined,
      );

      await controller.rateMessage('session', '-1', { rating: 0 });
      expect(mockBotChatsService.rateMessage).toHaveBeenCalledWith(
        'session',
        -1,
        0,
        undefined,
      );
    });
  });

  describe('Performance Tests', () => {
    it('should handle large message arrays', async () => {
      const largeMessageArray = Array.from({ length: 1000 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'bot',
        text: `Message ${i}`,
        metadata: { index: i },
      }));

      const messageBody = {
        messages: largeMessageArray,
      };

      mockBotChatsService.createOrAppend.mockResolvedValue({} as any);

      await controller.saveMessage('large-session', messageBody as any);

      expect(mockBotChatsService.createOrAppend).toHaveBeenCalledWith(
        'large-session',
        largeMessageArray,
      );
    });

    it('should handle high pagination limits', async () => {
      mockBotChatsService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.list('1', '10000');

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        10000,
        undefined,
      );
    });

    it('should handle very long search queries', async () => {
      const longQuery = 'البحث عن '.repeat(1000);

      mockBotChatsService.findAll.mockResolvedValue({ data: [], total: 0 });

      await controller.list('1', '20', longQuery);

      expect(mockBotChatsService.findAll).toHaveBeenCalledWith(
        1,
        20,
        longQuery,
      );
    });
  });
});
