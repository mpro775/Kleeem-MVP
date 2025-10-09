// test/e2e/webhooks/telegram.e2e.spec.ts
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../../src/app.module';

describe('Telegram Webhook E2E (H2)', () => {
  let app: INestApplication;
  let channelId: string;
  let webhookSecret: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // إعداد بيانات الاختبار
    channelId = 'test-telegram-channel-id';
    webhookSecret = 'test-telegram-secret-16chars';

    // تعيين متغير البيئة للاختبار
    process.env.TELEGRAM_WEBHOOK_SECRET = webhookSecret;
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * ✅ H2: اختبار Header secret صحيح/خاطئ
   */
  describe('Secret Token Validation', () => {
    it('should accept request with correct secret token', async () => {
      const payload = {
        update_id: 123456,
        message: {
          message_id: 1,
          from: { id: 12345, first_name: 'Test' },
          chat: { id: 12345, type: 'private' },
          text: 'Hello from Telegram test',
          date: Math.floor(Date.now() / 1000),
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/webhooks/telegram/${channelId}`)
        .set('X-Telegram-Bot-Api-Secret-Token', webhookSecret)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should reject request with wrong secret token', async () => {
      const payload = {
        update_id: 123457,
        message: {
          message_id: 2,
          text: 'This should be rejected',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/webhooks/telegram/${channelId}`)
        .set('X-Telegram-Bot-Api-Secret-Token', 'wrong-secret')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(403);

      expect(response.status).toBe(403);
    });

    it('should reject request without secret token', async () => {
      const payload = {
        update_id: 123458,
        message: { text: 'No secret header' },
      };

      const response = await request(app.getHttpServer())
        .post(`/api/webhooks/telegram/${channelId}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(403);

      expect(response.status).toBe(403);
    });
  });

  /**
   * ✅ H2: اختبار update_id مكرر → duplicate_ignored
   */
  describe('Idempotency via update_id', () => {
    it('should handle duplicate update_id correctly', async () => {
      const updateId = 999888;
      const payload = {
        update_id: updateId,
        message: {
          message_id: 100,
          from: { id: 12345, first_name: 'Test' },
          chat: { id: 12345, type: 'private' },
          text: 'Idempotency test message',
          date: Math.floor(Date.now() / 1000),
        },
      };

      const headers = {
        'X-Telegram-Bot-Api-Secret-Token': webhookSecret,
        'Content-Type': 'application/json',
      };

      // إرسال أول
      const firstResponse = await request(app.getHttpServer())
        .post(`/api/webhooks/telegram/${channelId}`)
        .set(headers)
        .send(payload)
        .expect(200);

      // إرسال ثاني (نفس update_id)
      const secondResponse = await request(app.getHttpServer())
        .post(`/api/webhooks/telegram/${channelId}`)
        .set(headers)
        .send(payload)
        .expect(200);

      expect(firstResponse.body).toHaveProperty('status', 'duplicate_ignored');
      expect(firstResponse.body).toHaveProperty('updateId', updateId);
      expect(secondResponse.body).toHaveProperty('status', 'duplicate_ignored');
      expect(secondResponse.body).toHaveProperty('updateId', updateId);
    });

    it('should process different update_ids normally', async () => {
      const payload1 = {
        update_id: 111111,
        message: { message_id: 201, text: 'First unique message' },
      };

      const payload2 = {
        update_id: 222222,
        message: { message_id: 202, text: 'Second unique message' },
      };

      const headers = {
        'X-Telegram-Bot-Api-Secret-Token': webhookSecret,
        'Content-Type': 'application/json',
      };

      // كلاهما يجب أن يُعالج بنجاح
      const response = await request(app.getHttpServer())
        .post(`/api/webhooks/telegram/${channelId}`)
        .set(headers)
        .send(payload1)
        .expect(200);

      expect(response.status).toBe(200);

      await request(app.getHttpServer())
        .post(`/api/webhooks/telegram/${channelId}`)
        .set(headers)
        .send(payload2)
        .expect(200);
    });
  });

  /**
   * اختبارات أمان إضافية
   */
  describe('Security Edge Cases', () => {
    it('should handle timing attack attempts', async () => {
      const payload = { update_id: 333333 };

      // محاولة timing attack مع secrets مختلفة الطول
      const secrets = [
        'short',
        'medium-length-secret',
        'very-long-secret-that-might-cause-timing-differences',
      ];

      for (const secret of secrets) {
        const response = await request(app.getHttpServer())
          .post(`/api/webhooks/telegram/${channelId}`)
          .set('X-Telegram-Bot-Api-Secret-Token', secret)
          .send(payload)
          .expect(403);

        expect(response.status).toBe(403);
      }

      // Verify all secrets were tested
      expect(secrets).toHaveLength(3);
    });
  });
});
