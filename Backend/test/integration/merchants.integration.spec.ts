import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { MerchantsModule } from '../../src/modules/merchants/merchants.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Merchants Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let authToken: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot('mongodb://localhost:27017/test'),
        AuthModule,
        UsersModule,
        MerchantsModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Create test user and get auth token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

    if (registerResponse.status === 201) {
      authToken = registerResponse.body.access_token;
    } else {
      // Try to login if user already exists
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });
      authToken = loginResponse.body.access_token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /merchants', () => {
    it('should create a new merchant with valid data', async () => {
      const merchantData = {
        name: 'Test Merchant',
        email: 'merchant@example.com',
        phone: '+1234567890',
        businessType: 'retail',
        address: {
          street: '123 Main St',
          city: 'Test City',
          country: 'Test Country',
        },
      };

      const response = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(merchantData.name);
      expect(response.body.email).toBe(merchantData.email);
    });

    it('should return 400 for invalid merchant data', async () => {
      const invalidMerchantData = {
        name: '', // Empty name
        email: 'invalid-email', // Invalid email
        phone: '123', // Invalid phone
      };

      const response = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMerchantData);

      expect(response.status).toBe(400);
    });

    it('should return 401 without authentication', async () => {
      const merchantData = {
        name: 'Test Merchant',
        email: 'merchant@example.com',
      };

      const response = await request(app.getHttpServer())
        .post('/merchants')
        .send(merchantData);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /merchants', () => {
    it('should return paginated merchants list', async () => {
      const response = await request(app.getHttpServer())
        .get('/merchants?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer()).get('/merchants');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /merchants/:id', () => {
    let merchantId: string;

    beforeAll(async () => {
      // Create a merchant for testing
      const merchantData = {
        name: 'Test Merchant for Get',
        email: 'get-test@example.com',
        phone: '+1234567890',
      };

      const response = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData);

      merchantId = response.body.id;
    });

    it('should return merchant by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(merchantId);
      expect(response.body.name).toBe('Test Merchant for Get');
    });

    it('should return 404 for non-existent merchant', async () => {
      const response = await request(app.getHttpServer())
        .get('/merchants/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer()).get(
        `/merchants/${merchantId}`,
      );

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /merchants/:id', () => {
    let merchantId: string;

    beforeAll(async () => {
      // Create a merchant for testing
      const merchantData = {
        name: 'Test Merchant for Update',
        email: 'update-test@example.com',
        phone: '+1234567890',
      };

      const response = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData);

      merchantId = response.body.id;
    });

    it('should update merchant with valid data', async () => {
      const updateData = {
        name: 'Updated Merchant Name',
        phone: '+0987654321',
      };

      const response = await request(app.getHttpServer())
        .put(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.phone).toBe(updateData.phone);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdateData = {
        email: 'invalid-email',
        phone: '123',
      };

      const response = await request(app.getHttpServer())
        .put(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdateData);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent merchant', async () => {
      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app.getHttpServer())
        .put('/merchants/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /merchants/:id', () => {
    let merchantId: string;

    beforeAll(async () => {
      // Create a merchant for testing
      const merchantData = {
        name: 'Test Merchant for Delete',
        email: 'delete-test@example.com',
        phone: '+1234567890',
      };

      const response = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData);

      merchantId = response.body.id;
    });

    it('should delete merchant successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent merchant', async () => {
      const response = await request(app.getHttpServer())
        .delete('/merchants/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer()).delete(
        `/merchants/${merchantId}`,
      );

      expect(response.status).toBe(401);
    });
  });
});
