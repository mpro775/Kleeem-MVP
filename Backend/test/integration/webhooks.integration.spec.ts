import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { MerchantsModule } from '../../src/modules/merchants/merchants.module';
import { UsersModule } from '../../src/modules/users/users.module';
import { WebhooksModule } from '../../src/modules/webhooks/webhooks.module';

describe('Webhooks Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  const mockUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockMerchant = {
    id: '507f1f77bcf86cd799439011',
    name: 'Test Merchant',
    slug: 'test-merchant',
    isActive: true,
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot(
          process.env.MONGODB_URI || 'mongodb://localhost:27017/test',
        ),
        AuthModule,
        UsersModule,
        MerchantsModule,
        WebhooksModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create test user and get auth token
    try {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(mockUser);

      if (registerResponse.status === 201) {
        authToken = registerResponse.body.access_token;
      } else {
        // Try to login if user already exists
        const loginResponse = await request(app.getHttpServer())
          .post('/auth/login')
          .send({
            email: mockUser.email,
            password: mockUser.password,
          });

        authToken = loginResponse.body.access_token;
      }
    } catch (error) {
      console.warn('Error during test setup:', error.message);
      authToken = 'mock-token';
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /webhooks/incoming/:merchantId', () => {
    it('should handle incoming webhook successfully', async () => {
      const webhookPayload = {
        messaging: [
          {
            sender: { id: '123456789' },
            message: { text: 'Hello from test!', mid: 'msg123' },
            timestamp: Date.now(),
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/incoming/${mockMerchant.id}`)
        .send(webhookPayload)
        .expect(200);

      expect(response.body).not.toBeUndefined();
    });

    it('should return error for invalid merchant', async () => {
      const webhookPayload = { test: 'data' };

      await request(app.getHttpServer())
        .post('/webhooks/incoming/invalid-merchant')
        .send(webhookPayload)
        .expect(500); // Because merchant not found
    });
  });

  describe('POST /webhooks/bot-reply/:merchantId', () => {
    it('should handle bot reply webhook successfully', async () => {
      const botReplyData = {
        channel: 'whatsapp',
        sessionId: 'session123',
        message: {
          text: 'Bot automated response',
          type: 'text',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/bot-reply/${mockMerchant.id}`)
        .send(botReplyData)
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: expect.any(String),
        status: 'ok',
      });
    });
  });

  describe('GET /webhooks/:merchantId/incoming', () => {
    it('should verify webhook correctly', async () => {
      const response = await request(app.getHttpServer())
        .get(`/webhooks/${mockMerchant.id}/incoming`)
        .query({
          'hub.verify_token': 'test-token',
          'hub.challenge': 'test-challenge',
          'hub.mode': 'subscribe',
        })
        .expect(200);

      expect(response.text).toBeDefined();
    });

    it('should reject invalid verification', async () => {
      await request(app.getHttpServer())
        .get(`/webhooks/${mockMerchant.id}/incoming`)
        .query({
          'hub.verify_token': 'wrong-token',
          'hub.mode': 'subscribe',
        })
        .expect(403);
    });
  });

  describe('POST /webhooks/agent-reply/:merchantId', () => {
    it('should handle agent reply successfully', async () => {
      const agentReplyData = {
        sessionId: 'session123',
        agentId: 'agent123',
        message: {
          text: 'Agent response',
          type: 'text',
        },
      };

      const response = await request(app.getHttpServer())
        .post(`/webhooks/agent-reply/${mockMerchant.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(agentReplyData)
        .expect(200);

      expect(response.body).toMatchObject({
        sessionId: 'session123',
      });
    });

    it('should require authentication for agent replies', async () => {
      const agentReplyData = {
        sessionId: 'session123',
        agentId: 'agent123',
        message: {
          text: 'Agent response',
          type: 'text',
        },
      };

      await request(app.getHttpServer())
        .post(`/webhooks/agent-reply/${mockMerchant.id}`)
        .send(agentReplyData)
        .expect(401);
    });
  });
});
