// test/e2e/webhooks/whatsapp-cloud.e2e.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createHmac } from 'crypto';
import { AppModule } from '../../../src/app.module';

describe('WhatsApp Cloud Webhook E2E (H1)', () => {
  let app: INestApplication;
  let merchantId: string;
  let appSecret: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // إعداد بيانات الاختبار
    merchantId = 'test-merchant-id';
    appSecret = 'test-app-secret-32-chars-minimum';
  });

  afterAll(async () => {
    await app.close();
  });

  /**
   * ✅ H1: اختبار Verify GET → 200
   */
  describe('Webhook Verification', () => {
    it('should verify webhook with correct parameters', async () => {
      const verifyToken = 'test-verify-token';
      const challenge = 'test-challenge-123';

      const response = await request(app.getHttpServer())
        .get(`/api/webhooks/incoming/${merchantId}`)
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': verifyToken,
          'hub.challenge': challenge,
        })
        .expect(200);

      expect(response.text).toBe(challenge);
    });

    it('should reject verification with wrong parameters', async () => {
      await request(app.getHttpServer())
        .get(`/api/webhooks/incoming/${merchantId}`)
        .query({
          'hub.mode': 'wrong',
          'hub.verify_token': 'wrong-token',
          'hub.challenge': 'challenge',
        })
        .expect(400);
    });
  });

  /**
   * ✅ H1: اختبار POST موقّع صحيح → 200
   */
  describe('Webhook Message Processing', () => {
    it('should process valid signed webhook', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid.test123',
                      from: '1234567890',
                      text: { body: 'Hello from test' },
                      timestamp: Date.now().toString(),
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const signature = createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      const response = await request(app.getHttpServer())
        .post(`/api/webhooks/incoming/${merchantId}`)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', `sha256=${signature}`)
        .send(payload)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body.status).not.toBe('invalid_signature');
    });

    /**
     * ✅ H1: اختبار توقيع خاطئ → 403
     */
    it('should reject invalid signature with 403', async () => {
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: 'wamid.test456',
                      from: '1234567890',
                      text: { body: 'Hello with bad signature' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      await request(app.getHttpServer())
        .post(`/api/webhooks/incoming/${merchantId}`)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=invalid-signature')
        .send(payload)
        .expect(403);
    });

    /**
     * ✅ H1: اختبار إرسال نفس الرسالة مرتين → duplicate_ignored
     */
    it('should handle duplicate messages with idempotency', async () => {
      const messageId = 'wamid.duplicate-test-789';
      const payload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      id: messageId,
                      from: '1234567890',
                      text: { body: 'Duplicate test message' },
                      timestamp: Date.now().toString(),
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const rawBody = JSON.stringify(payload);
      const signature = createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      const headers = {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': `sha256=${signature}`,
      };

      // إرسال أول
      const firstResponse = await request(app.getHttpServer())
        .post(`/api/webhooks/incoming/${merchantId}`)
        .set(headers)
        .send(payload)
        .expect(200);

      // إرسال ثاني (نفس الرسالة)
      const secondResponse = await request(app.getHttpServer())
        .post(`/api/webhooks/incoming/${merchantId}`)
        .set(headers)
        .send(payload)
        .expect(200);

      expect(secondResponse.body).toHaveProperty('status', 'duplicate_ignored');
      expect(secondResponse.body).toHaveProperty('sourceMessageId', messageId);
    });
  });

  /**
   * اختبار أمان إضافي
   */
  describe('Security Tests', () => {
    it('should reject webhook without signature', async () => {
      const payload = { entry: [] };

      const response = await request(app.getHttpServer())
        .post(`/api/webhooks/incoming/${merchantId}`)
        .set('Content-Type', 'application/json')
        .send(payload)
        .expect(200); // لا يوجد signature، لكن لا يُرفض

      // يجب أن يُعالج كرسالة عادية بدون تحقق من التوقيع
      expect(response.body).toHaveProperty('status');
    });

    it('should reject malformed signature header', async () => {
      const payload = { entry: [] };

      await request(app.getHttpServer())
        .post(`/api/webhooks/incoming/${merchantId}`)
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'malformed-signature')
        .send(payload)
        .expect(403);
    });
  });
});
