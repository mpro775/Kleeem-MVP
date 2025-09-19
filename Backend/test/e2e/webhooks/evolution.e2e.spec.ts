// test/e2e/webhooks/evolution.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';

describe('Evolution API Webhook E2E (H3)', () => {
  let app: INestApplication;
  let channelId: string;
  let apiKey: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // إعداد بيانات الاختبار
    channelId = 'test-evolution-channel-id';
    apiKey = 'test-evolution-api-key-16chars-min';

    // تعيين متغير البيئة للاختبار
    process.env.EVOLUTION_APIKEY = apiKey;
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * ✅ H3: اختبار apikey صحيح/خاطئ
   */
  describe('API Key Validation', () => {
    it('should accept request with correct API key (X-Evolution-ApiKey)', async () => {
      const payload = {
        messages: [
          {
            key: { id: 'evo-test-message-123' },
            message: { conversation: 'Hello from Evolution test' },
            messageTimestamp: Date.now(),
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}`)
        .set('X-Evolution-ApiKey', apiKey)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should accept request with correct API key (apikey header)', async () => {
      const payload = {
        messages: [
          {
            key: { id: 'evo-test-message-124' },
            message: { conversation: 'Hello with apikey header' },
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}`)
        .set('apikey', apiKey)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);
    });

    it('should reject request with wrong API key', async () => {
      const payload = {
        messages: [
          {
            key: { id: 'evo-test-message-125' },
            message: { conversation: 'This should be rejected' },
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}`)
        .set('X-Evolution-ApiKey', 'wrong-api-key')
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(403);
    });

    it('should reject request without API key', async () => {
      const payload = {
        messages: [{ key: { id: 'evo-test-no-key' } }],
      };

      await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(403);
    });
  });

  /**
   * ✅ H3: اختبار نفس key.id مكرر → duplicate_ignored
   */
  describe('Idempotency via message key.id', () => {
    it('should handle duplicate message key.id correctly', async () => {
      const messageKeyId = 'evo-duplicate-key-999';
      const payload = {
        messages: [
          {
            key: { id: messageKeyId },
            message: { conversation: 'Idempotency test for Evolution' },
            messageTimestamp: Date.now(),
          },
        ],
      };

      const headers = {
        'X-Evolution-ApiKey': apiKey,
        'Content-Type': 'application/json',
      };

      // إرسال أول
      const firstResponse = await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}`)
        .set(headers)
        .send(payload)
        .expect(200);

      // إرسال ثاني (نفس key.id)
      const secondResponse = await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}`)
        .set(headers)
        .send(payload)
        .expect(200);

      expect(secondResponse.body).toHaveProperty('status', 'duplicate_ignored');
      expect(secondResponse.body).toHaveProperty('messageId', messageKeyId);
    });

    it('should handle messages with nested data structure', async () => {
      const payload = {
        data: {
          messages: [
            {
              key: { id: 'evo-nested-test-456' },
              message: { conversation: 'Nested data test' },
            },
          ],
        },
      };

      await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}`)
        .set('X-Evolution-ApiKey', apiKey)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200);
    });
  });

  /**
   * اختبارات أمان متقدمة
   */
  describe('Advanced Security Tests', () => {
    it('should handle timing attacks on API key comparison', async () => {
      const payload = { messages: [] };

      // محاولة timing attack مع مفاتيح مختلفة الطول
      const keys = [
        'x',
        'short-key',
        'medium-length-api-key-test',
        'very-long-api-key-that-might-cause-timing-differences-in-comparison',
      ];

      for (const key of keys) {
        await request(app.getHttpServer())
          .post(`/api/webhooks/whatsapp_qr/${channelId}`)
          .set('X-Evolution-ApiKey', key)
          .send(payload)
          .expect(403);
      }
    });

    it('should handle status update events', async () => {
      const statusPayload = {
        status: 'open',
        instance: { status: 'connected' },
      };

      await request(app.getHttpServer())
        .post(`/api/webhooks/whatsapp_qr/${channelId}/event`)
        .set('X-Evolution-ApiKey', apiKey)
        .set('Content-Type', 'application/json')
        .send(statusPayload)
        .expect(200);
    });
  });
});
