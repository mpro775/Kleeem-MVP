import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import Redis from 'ioredis-mock';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('API Integration Tests', () => {
  let app: INestApplication;
  let mongo: MongoMemoryReplSet;
  let redis: any;
  let accessToken: string;
  let merchantId: string;

  beforeAll(async () => {
    // Setup MongoDB Memory Server
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    const mongoUri = mongo.getUri();

    // Setup Redis Mock
    redis = new Redis();

    // Override environment variables
    process.env.MONGO_URI = mongoUri;
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.JWT_ACCESS_EXPIRES = '15m';
    process.env.JWT_REFRESH_EXPIRES = '7d';
    process.env.NODE_ENV = 'test';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
    await mongo?.stop();
    await redis?.disconnect();
  });

  describe('Authentication Flow', () => {
    const testUser = {
      email: 'test@example.com',
      password: 'Password123!',
      businessName: 'Test Business',
      phoneNumber: '+966501234567',
    };

    it('should register a new merchant successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      merchantId = response.body.user.merchantId;
    });

    it('should not allow duplicate registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(testUser)
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', testUser.email);

      accessToken = response.body.accessToken;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.status).toBe(200);
    });

    it('should reject access without token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('Products Management', () => {
    let productId: string;

    const testProduct = {
      name: 'Test Product',
      description: 'A test product for integration testing',
      price: 99.99,
      quantity: 10,
      category: null,
      images: [],
      attributes: [],
      keywords: ['test', 'product'],
    };

    it('should create a new product', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(testProduct)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('name', testProduct.name);
      expect(response.body).toHaveProperty('price', testProduct.price);
      expect(response.body).toHaveProperty('merchantId', merchantId);

      productId = response.body._id;
    });

    it('should get products list with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 10);
      expect(Array.isArray(response.body.products)).toBe(true);
    });

    it('should get a single product by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', productId);
      expect(response.body).toHaveProperty('name', testProduct.name);
    });

    it('should update a product', async () => {
      const updateData = {
        name: 'Updated Product Name',
        price: 149.99,
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('name', updateData.name);
      expect(response.body).toHaveProperty('price', updateData.price);
    });

    it('should search products', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products/search?q=test&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should delete a product', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.status).toBe(200);

      // Verify product is deleted
    });
  });

  describe('Orders Management', () => {
    let orderId: string;
    let productId: string;

    beforeAll(async () => {
      // Create a product first for the order
      const productResponse = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'Order Test Product',
          price: 50.0,
          quantity: 100,
        });
      productId = productResponse.body._id;
    });

    const testOrder = {
      sessionId: 'test-session-123',
      customer: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+966501234567',
      },
      products: [
        {
          product: '', // Will be set dynamically
          name: 'Order Test Product',
          price: 50.0,
          quantity: 2,
        },
      ],
      source: 'api',
    };

    it('should create a new order', async () => {
      testOrder.products[0].product = productId;

      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .send(testOrder)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body).toHaveProperty('sessionId', testOrder.sessionId);
      expect(response.body).toHaveProperty('customer');
      expect(response.body.customer).toHaveProperty(
        'name',
        testOrder.customer.name,
      );

      orderId = response.body._id;
    });

    it('should get orders for merchant', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders/merchant?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    it('should get a single order by ID', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('_id', orderId);
      expect(response.body).toHaveProperty('sessionId', testOrder.sessionId);
    });

    it('should update order status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'paid' })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'paid');
    });

    it('should get order statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          // Missing required fields
          price: 'invalid',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should handle not found errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products/507f1f77bcf86cd799439011') // Valid ObjectId that doesn't exist
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should handle unauthorized access', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login endpoint', async () => {
      const promises: any[] = [];

      // Make multiple requests quickly
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app.getHttpServer()).post('/api/auth/login').send({
            email: 'nonexistent@example.com',
            password: 'wrongpassword',
          }),
        );
      }

      const responses = await Promise.all(promises);

      // Should have some rate limited responses (429)
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
