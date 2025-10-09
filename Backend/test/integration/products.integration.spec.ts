import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AuthModule } from '../../src/modules/auth/auth.module';
import { MerchantsModule } from '../../src/modules/merchants/merchants.module';
import { ProductsModule } from '../../src/modules/products/products.module';
import { UsersModule } from '../../src/modules/users/users.module';

describe('Products Integration Tests', () => {
  let app: INestApplication;
  let authToken: string;

  const mockUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  const mockProduct = {
    name: 'Test Product',
    description: 'Test Description',
    price: 99.99,
    category: 'Electronics',
    currency: 'SAR',
    isAvailable: true,
    keywords: ['electronics', 'test'],
    images: ['image1.jpg'],
    externalId: 'ext-prod-123',
    platform: 'test-platform',
    source: 'manual',
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
        ProductsModule,
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
      console.warn(
        'Error during test setup:',
        error instanceof Error ? error.message : String(error),
      );
      authToken = 'mock-token';
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /products', () => {
    it('should create a new product successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProduct)
        .expect(201);

      expect(response.body).toMatchObject({
        name: mockProduct.name,
        description: mockProduct.description,
        price: mockProduct.price,
        category: mockProduct.category,
      });
    });

    it('should return 400 for invalid product data', async () => {
      const invalidProductDto = {
        name: '', // invalid empty name
        price: -10, // invalid negative price
        category: '', // invalid empty category
      };

      const response = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidProductDto)
        .expect(400);

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthorized access', async () => {
      const response = await request(app.getHttpServer())
        .post('/products')
        .send(mockProduct)
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /products/:id', () => {
    it('should return product by id', async () => {
      // First create a product to test
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProduct)
        .expect(201);

      const productId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .get(`/products/${productId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: productId,
        name: mockProduct.name,
        price: mockProduct.price,
        category: mockProduct.category,
      });
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439999';

      const response = await request(app.getHttpServer())
        .get(`/products/${fakeId}`)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /products (list products by merchant)', () => {
    it('should return products list with pagination', async () => {
      // First create a product to list
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProduct)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.items)).toBe(true);

      expect(response.body.items[0]).toMatchObject({
        name: expect.any(String),
        price: expect.any(Number),
      });
    });

    it('should return 401 for unauthorized access to product list', async () => {
      const response = await request(app.getHttpServer())
        .get('/products')
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /products/:id', () => {
    it('should update product successfully', async () => {
      // First create a product to update
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProduct)
        .expect(201);

      const productId = createResponse.body.id;
      const updateData = {
        name: 'Updated Product',
        price: 199.99,
        isAvailable: false,
      };

      const response = await request(app.getHttpServer())
        .put(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: productId,
        name: updateData.name,
        price: updateData.price,
        isAvailable: updateData.isAvailable,
      });
    });

    it('should return 404 for non-existent product update', async () => {
      const fakeId = '507f1f77bcf86cd799439999';
      const updateData = { name: 'Updated' };

      const response = await request(app.getHttpServer())
        .put(`/products/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete product successfully', async () => {
      // First create a product to delete
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProduct)
        .expect(201);

      const productId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/products/${productId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 404 for non-existent product deletion', async () => {
      const fakeId = '507f1f77bcf86cd799439999';

      const response = await request(app.getHttpServer())
        .delete(`/products/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /products/search', () => {
    it('should search products by query', async () => {
      // First create a product to search
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProduct)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/products/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'test' })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it('should handle empty search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/products/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ q: 'nonexistent-product-name-search' })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });
  });

  describe('PUT /products/:id/availability', () => {
    it('should update product availability successfully', async () => {
      // First create a product to update availability
      const createResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(mockProduct)
        .expect(201);

      const productId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .post(`/products/${productId}/availability`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isAvailable: false })
        .expect(200);

      expect(response.body).not.toBeUndefined();
    });

    it('should return 404 for non-existent product', async () => {
      const fakeId = '507f1f77bcf86cd799439999';

      const response = await request(app.getHttpServer())
        .post(`/products/${fakeId}/availability`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isAvailable: false })
        .expect(404);

      expect(response.status).toBe(404);
    });
  });
});
