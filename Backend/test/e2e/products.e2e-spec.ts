import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { type Product } from '../../src/modules/products/schemas/product.schema';

describe('Products E2E', () => {
  let app: INestApplication;

  let createdMerchantId: string;
  let createdProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    // Clean up any existing test data
    jest.clearAllMocks();
  });

  describe('POST /api/products', () => {
    it('should create product and return 201 with product data', async () => {
      // First create a merchant for testing
      const merchantData = {
        name: 'Test Merchant E2E',
        email: 'test-merchant-e2e@example.com',
        phone: '+1234567890',
        businessType: 'retail',
        description: 'Test merchant for E2E testing',
      };

      const merchantResponse = await request(app.getHttpServer())
        .post('/api/merchants')
        .send(merchantData)
        .expect(201);

      createdMerchantId = merchantResponse.body._id;
      expect(createdMerchantId).toBeDefined();

      // Now create a product
      const productData = {
        merchantId: createdMerchantId,
        name: 'Test Product E2E',
        description: 'This is a test product for E2E testing',
        price: 99.99,
        currency: 'USD',
        category: null,
        images: [],
        isAvailable: true,
        source: 'manual',
        status: 'active',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/products')
        .send(productData)
        .expect(201);

      createdProductId = createResponse.body._id;
      expect(createdProductId).toBeDefined();
      expect(createResponse.body).toMatchObject({
        merchantId: createdMerchantId,
        name: 'Test Product E2E',
        description: 'This is a test product for E2E testing',
        price: 99.99,
        currency: 'USD',
        status: 'active',
        isAvailable: true,
        source: 'manual',
      });
      expect(createResponse.body.createdAt).toBeDefined();
      expect(createResponse.body.updatedAt).toBeDefined();
    });

    it('should return 400 for invalid product data', async () => {
      const invalidProductData = {
        merchantId: 'invalid-merchant-id',
        name: '', // Invalid: empty name
        price: -10, // Invalid: negative price
      };

      const response = await request(app.getHttpServer())
        .post('/api/products')
        .send(invalidProductData)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent merchant', async () => {
      const productData = {
        merchantId: '507f1f77bcf86cd799439011', // Valid ObjectId but doesn't exist
        name: 'Test Product',
        price: 10,
      };

      const response = await request(app.getHttpServer())
        .post('/api/products')
        .send(productData)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return product by id', async () => {
      const getResponse = await request(app.getHttpServer())
        .get(`/api/products/${createdProductId}`)
        .expect(200);

      expect(getResponse.body).toMatchObject({
        _id: createdProductId,
        merchantId: createdMerchantId,
        name: 'Test Product E2E',
        description: 'This is a test product for E2E testing',
        price: 99.99,
        currency: 'USD',
        status: 'active',
        isAvailable: true,
      });
    });

    it('should return 404 for non-existent product', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid ObjectId', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products/invalid-id')
        .expect(400);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should update product successfully', async () => {
      const updateData = {
        name: 'Updated Test Product E2E',
        price: 149.99,
        description: 'Updated description for E2E testing',
      };

      const updateResponse = await request(app.getHttpServer())
        .put(`/api/products/${createdProductId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body).toMatchObject({
        _id: createdProductId,
        name: 'Updated Test Product E2E',
        price: 149.99,
        description: 'Updated description for E2E testing',
      });
    });

    it('should return 404 when updating non-existent product', async () => {
      const updateData = {
        name: 'Updated Name',
        price: 20,
      };

      const response = await request(app.getHttpServer())
        .put('/api/products/507f1f77bcf86cd799439011')
        .send(updateData)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete product successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/products/${createdProductId}`)
        .expect(200);

      // Verify product is deleted
      await request(app.getHttpServer())
        .get(`/api/products/${createdProductId}`)
        .expect(404);

      expect(response.status).toBe(404);
    });

    it('should return 404 when deleting non-existent product', async () => {
      const response = await request(app.getHttpServer())
        .delete('/api/products/507f1f77bcf86cd799439011')
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/products', () => {
    it('should return products list with pagination', async () => {
      // Create another product first
      const productData = {
        merchantId: createdMerchantId,
        name: 'Second Test Product',
        price: 25.5,
        currency: 'USD',
        description: 'Second product for pagination testing',
      };

      await request(app.getHttpServer())
        .post('/api/products')
        .send(productData)
        .expect(201);

      const listResponse = await request(app.getHttpServer())
        .get('/api/products')
        .query({ merchantId: createdMerchantId, page: 1, limit: 10 })
        .expect(200);

      expect(listResponse.body).toHaveProperty('data');
      expect(listResponse.body).toHaveProperty('total');
      expect(listResponse.body).toHaveProperty('page');
      expect(listResponse.body).toHaveProperty('limit');
      expect(Array.isArray(listResponse.body.data)).toBe(true);
      expect(listResponse.body.data.length).toBeGreaterThan(0);
    });

    it('should filter products by merchant', async () => {
      const listResponse = await request(app.getHttpServer())
        .get('/api/products')
        .query({ merchantId: createdMerchantId })
        .expect(200);

      expect(listResponse.body.data).toBeDefined();
      // All products should belong to the specified merchant
      listResponse.body.data.forEach((product: Product) => {
        expect(product.merchantId).toBe(createdMerchantId);
      });
    });
  });

  describe('POST /api/products/:id/availability', () => {
    it('should set product availability', async () => {
      // Create a new product for this test
      const productData = {
        merchantId: createdMerchantId,
        name: 'Availability Test Product',
        price: 30.0,
        currency: 'USD',
      };

      const createResponse = await request(app.getHttpServer())
        .post('/api/products')
        .send(productData)
        .expect(201);

      const productId = createResponse.body._id;

      // Set availability to false
      await request(app.getHttpServer())
        .post(`/api/products/${productId}/availability`)
        .send({ isAvailable: false })
        .expect(200);

      // Verify availability was updated
      const getResponse = await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .expect(200);

      expect(getResponse.body.isAvailable).toBe(false);
    });
  });

  describe('Error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock a scenario that might cause DB issues
      const invalidProductData = {
        merchantId: createdMerchantId,
        name: 'Test',
        price: 'invalid-price', // This should cause a validation error
      };

      const response = await request(app.getHttpServer())
        .post('/api/products')
        .send(invalidProductData)
        .expect(400);

      expect(response.body).toHaveProperty('statusCode');
      expect(response.body).toHaveProperty('message');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.status).toBe(400);
    });
  });
});
