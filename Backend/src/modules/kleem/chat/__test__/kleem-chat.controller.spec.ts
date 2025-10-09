import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request = require('supertest');

import { BotChatsService } from '../../botChats/botChats.service';
import { KleemChatController } from '../kleem-chat.controller';
import { KleemChatService } from '../kleem-chat.service';

import type { INestApplication } from '@nestjs/common';
import type { Test as SuperTest } from 'supertest';

// Mock the DTO classes since they're defined inline in the controller
jest.mock('../kleem-chat.controller', () => {
  const actual = jest.requireActual('../kleem-chat.controller');
  return {
    ...actual,
    SendKaleemMessageDto: class SendKaleemMessageDto {
      text!: string;
      metadata?: Record<string, unknown>;
    },
    RateMessageKaleemDto: class RateMessageKaleemDto {
      msgIdx!: number;
      rating!: 0 | 1;
      feedback?: string;
    },
  };
});

describe('KleemChatController', () => {
  let app: INestApplication;
  let _controller: KleemChatController;
  let kleemChatService: jest.Mocked<KleemChatService>;
  let botChatsService: jest.Mocked<BotChatsService>;

  const mockSession = {
    _id: '507f1f77bcf86cd799439011',
    sessionId: 'session-123',
    messages: [
      {
        role: 'user',
        text: 'مرحباً',
        metadata: { platform: 'web' },
        timestamp: new Date(),
      },
      {
        role: 'bot',
        text: 'مرحباً! كيف يمكنني مساعدتك؟',
        metadata: {},
        timestamp: new Date(),
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockKleemChatService = {
      handleUserMessage: jest.fn(),
    };

    const mockBotChatsService = {
      rateMessage: jest.fn(),
      findBySession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KleemChatController],
      providers: [
        {
          provide: KleemChatService,
          useValue: mockKleemChatService,
        },
        {
          provide: BotChatsService,
          useValue: mockBotChatsService,
        },
      ],
    }).compile();

    _controller = module.get<KleemChatController>(KleemChatController);
    kleemChatService = module.get(KleemChatService);
    botChatsService = module.get(BotChatsService);

    app = module.createNestApplication();
    await app.init();

    // Setup default mocks
    kleemChatService.handleUserMessage.mockResolvedValue({ status: 'queued' });
    botChatsService.rateMessage.mockResolvedValue({ status: 'rated' });
    botChatsService.findBySession.mockResolvedValue(mockSession as any);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /kleem/chat/:sessionId/message', () => {
    it('should send message successfully', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً، كيف حالك؟',
        metadata: { platform: 'web', userAgent: 'Mozilla/5.0' },
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageData.text,
        messageData.metadata,
      );
      expect(response.body).toEqual({ status: 'queued' });
    });

    it('should handle message without metadata', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageData.text,
        undefined,
      );
      expect(response.body).toEqual({ status: 'queued' });
    });

    it('should handle service errors', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً',
      };

      kleemChatService.handleUserMessage.mockRejectedValue(
        new Error('Service error'),
      );

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(500);

      expect(response.body.message).toContain('sessionId');
    });

    it('should validate required text field', async () => {
      const sessionId = 'session-123';
      const messageData = {
        metadata: { platform: 'web' },
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(400);

      expect(response.body.message).toContain('text');
    });

    it('should validate text as non-empty string', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: '',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(400);

      expect(response.body.message).toContain('text');
    });

    it('should validate metadata as object when provided', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً',
        metadata: 'not_an_object',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(400);

      expect(response.body.message).toContain('metadata');
    });

    it('should handle special characters in text', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً! كيف حالك؟ 😊 هل يمكنك مساعدتي في استفسار عن الخدمات 🚀',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: 'queued' });
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageData.text,
        undefined,
      );
    });

    it('should handle unicode text correctly', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'أريد الاستفسار عن الخدمات المتاحة في المنصة',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: 'queued' });
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageData.text,
        undefined,
      );
    });
  });

  describe('POST /kleem/chat/:sessionId/rate', () => {
    it('should rate message successfully', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 2,
        rating: 1,
        feedback: 'كانت الإجابة مفيدة جداً',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(200);

      expect(botChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        ratingData.msgIdx,
        ratingData.rating,
        ratingData.feedback,
      );
      expect(response.body).toEqual({ status: 'rated' });
    });

    it('should rate message without feedback', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 1,
        rating: 0,
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(200);

      expect(botChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        ratingData.msgIdx,
        ratingData.rating,
        undefined,
      );
      expect(response.body).toEqual({ status: 'rated' });
    });

    it('should validate required msgIdx field', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        rating: 1,
        feedback: 'تعليق',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(400);

      expect(response.body.message).toContain('msgIdx');
    });

    it('should validate msgIdx as number', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 'not_a_number',
        rating: 1,
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(400);

      expect(response.body.message).toContain('msgIdx');
      expect(response.body.message).toContain('number');
    });

    it('should validate msgIdx minimum value', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: -1,
        rating: 1,
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(400);

      expect(response.body.message).toContain('msgIdx');
      expect(response.body.message).toContain('minimum');
      expect(response.body.message).toContain('0');
    });

    it('should validate rating field', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 2,
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(400);

      expect(response.body.message).toContain('rating');
    });

    it('should validate rating enum values', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 2,
        rating: 2, // Invalid value, should be 0 or 1
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(400);

      expect(response.body.message).toContain('rating');
      expect(response.body.message).toContain('enum');
      expect(response.body.message).toContain('0');
      expect(response.body.message).toContain('1');
    });

    it('should validate feedback maximum length', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 2,
        rating: 1,
        feedback: 'x'.repeat(501), // Exceeds 500 character limit
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(400);

      expect(response.body.message).toContain('feedback');
      expect(response.body.message).toContain('maximum');
      expect(response.body.message).toContain('500');
      expect(response.body.message).toContain('characters');
    });

    it('should handle service errors', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 2,
        rating: 1,
      };

      botChatsService.rateMessage.mockRejectedValue(
        new NotFoundException('Session or message not found'),
      );

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(404);

      expect(response.body.message).toContain('sessionId');
    });

    it('should handle database errors', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 2,
        rating: 1,
      };

      botChatsService.rateMessage.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(500);

      expect(response.body.message).toContain('sessionId');
    });
  });

  describe('GET /kleem/chat/:sessionId', () => {
    it('should retrieve session successfully', async () => {
      const sessionId = 'session-123';

      const response = await request(app.getHttpServer())
        .get(`/kleem/chat/${sessionId}`)
        .expect(200);

      expect(botChatsService.findBySession).toHaveBeenCalledWith(sessionId);
      expect(response.body).toEqual(mockSession);
    });

    it('should return 404 when session not found', async () => {
      const sessionId = 'non-existent-session';

      botChatsService.findBySession.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/kleem/chat/${sessionId}`)
        .expect(404);

      expect(response.body.message).toContain('sessionId');
    });

    it('should handle service errors', async () => {
      const sessionId = 'session-123';

      botChatsService.findBySession.mockRejectedValue(
        new Error('Database error'),
      );

      const response = await request(app.getHttpServer())
        .get(`/kleem/chat/${sessionId}`)
        .expect(500);

      expect(response.body.message).toContain('sessionId');
    });

    it('should handle malformed sessionId', async () => {
      const sessionId = 'invalid..session..id';

      // Mock should handle invalid session IDs gracefully
      botChatsService.findBySession.mockResolvedValue(null);

      const response = await request(app.getHttpServer())
        .get(`/kleem/chat/${sessionId}`)
        .expect(404);

      expect(response.body.message).toContain('sessionId');
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle very long text messages', async () => {
      const sessionId = 'session-123';
      const longText = 'م'.repeat(10000); // Very long message
      const messageData = {
        text: longText,
      };

      // Should handle without crashing
      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: 'queued' });
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        longText,
        undefined,
      );
    });

    it('should handle empty metadata object', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً',
        metadata: {},
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: 'queued' });
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageData.text,
        messageData.metadata,
      );
    });

    it('should handle nested metadata objects', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً',
        metadata: {
          user: {
            id: '123',
            preferences: {
              language: 'ar',
              notifications: true,
            },
          },
          device: {
            type: 'mobile',
            os: 'iOS',
          },
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: 'queued' });
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageData.text,
        messageData.metadata,
      );
    });

    it('should handle concurrent requests', async () => {
      const sessionId = 'session-123';
      const requests: SuperTest[] = [];

      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app.getHttpServer())
            .post(`/kleem/chat/${sessionId}/message`)
            .send({
              text: `رسالة ${i}`,
            }),
        );
      }

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'queued' });
      });

      expect(kleemChatService.handleUserMessage).toHaveBeenCalledTimes(5);
    });

    it('should handle malformed JSON in request body', async () => {
      const sessionId = 'session-123';

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);
      expect(response.body.message).toContain('text');
    });

    it('should handle missing request body', async () => {
      const sessionId = 'session-123';

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .expect(400);
      expect(response.body.message).toContain('text');
    });
  });

  describe('Security and validation', () => {
    it('should reject invalid sessionId format', async () => {
      const invalidSessionIds = [
        '',
        ' ',
        '../etc/passwd',
        'session-with-../../../path',
        'session<script>alert("xss")</script>',
      ];

      for (const sessionId of invalidSessionIds) {
        const response = await request(app.getHttpServer())
          .post(`/kleem/chat/${sessionId}/message`)
          .send({
            text: 'test',
          });

        // Should either return 404 or handle gracefully
        expect([400, 404, 500]).toContain(response.status);
      }
    });

    it('should handle SQL injection attempts in text', async () => {
      const sessionId = 'session-123';
      const maliciousText = "'; DROP TABLE users; --";

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send({
          text: maliciousText,
        })
        .expect(200);

      expect(response.body.message).toContain('text');
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        maliciousText,
        undefined,
      );
    });

    it('should handle XSS attempts in text', async () => {
      const sessionId = 'session-123';
      const xssText =
        '<script>alert("xss")</script><img src="x" onerror="alert(1)">';

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send({
          text: xssText,
        })
        .expect(200);

      expect(response.body.message).toContain('text');
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        xssText,
        undefined,
      );
    });

    it('should validate feedback length constraint', async () => {
      const sessionId = 'session-123';
      const longFeedback = 'x'.repeat(501);

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send({
          msgIdx: 1,
          rating: 1,
          feedback: longFeedback,
        })
        .expect(400);

      expect(response.body.message).toContain('feedback');
      expect(response.body.message).toContain('maximum');
      expect(response.body.message).toContain('500');
      expect(response.body.message).toContain('characters');
      expect(response.body.message).toContain('characters');
    });

    it('should handle negative msgIdx values', async () => {
      const sessionId = 'session-123';

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send({
          msgIdx: -5,
          rating: 1,
        })
        .expect(400);

      expect(response.body.message).toContain('msgIdx');
      expect(response.body.message).toContain('minimum');
      expect(response.body.message).toContain('0');
      expect(response.body.message).toContain('characters');
    });

    it('should handle extremely large msgIdx values', async () => {
      const sessionId = 'session-123';

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send({
          msgIdx: Number.MAX_SAFE_INTEGER,
          rating: 1,
        })
        .expect(200); // Should not crash

      expect(response.body.message).toContain('msgIdx');
      expect(response.body.message).toContain('maximum');
      expect(response.body.message).toContain('2147483647');
      expect(botChatsService.rateMessage).toHaveBeenCalledWith(
        sessionId,
        Number.MAX_SAFE_INTEGER,
        1,
        undefined,
      );
    });
  });

  describe('Response format validation', () => {
    it('should return consistent response format for messages', async () => {
      const sessionId = 'session-123';
      const messageData = {
        text: 'مرحباً',
        metadata: { source: 'mobile_app' },
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(typeof response.body.status).toBe('string');
      expect(response.body.status).toBe('queued');
    });

    it('should return consistent response format for ratings', async () => {
      const sessionId = 'session-123';
      const ratingData = {
        msgIdx: 2,
        rating: 1,
        feedback: 'ممتاز',
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/rate`)
        .send(ratingData)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(typeof response.body.status).toBe('string');
      expect(response.body.status).toBe('rated');
    });

    it('should return session data in correct format', async () => {
      const sessionId = 'session-123';

      const response = await request(app.getHttpServer())
        .get(`/kleem/chat/${sessionId}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('sessionId');
      expect(response.body).toHaveProperty('messages');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
      expect(Array.isArray(response.body.messages)).toBe(true);
    });
  });

  describe('Performance considerations', () => {
    it('should handle rapid consecutive requests', async () => {
      const sessionId = 'session-123';
      const promises: Promise<request.Response>[] = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer())
            .post(`/kleem/chat/${sessionId}/message`)
            .send({
              text: `رسالة سريعة ${i}`,
            }),
        );
      }

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(kleemChatService.handleUserMessage).toHaveBeenCalledTimes(10);
    });

    it('should handle large metadata objects', async () => {
      const sessionId = 'session-123';
      const largeMetadata = {};

      // Create large metadata object
      for (let i = 0; i < 100; i++) {
        largeMetadata[`key${i}`] = `value${i}`.repeat(10);
      }

      const messageData = {
        text: 'مرحباً',
        metadata: largeMetadata,
      };

      const response = await request(app.getHttpServer())
        .post(`/kleem/chat/${sessionId}/message`)
        .send(messageData)
        .expect(200);

      expect(response.body).toEqual({ status: 'queued' });
      expect(kleemChatService.handleUserMessage).toHaveBeenCalledWith(
        sessionId,
        messageData.text,
        messageData.metadata,
      );
    });
  });
});
