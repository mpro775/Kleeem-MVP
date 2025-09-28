import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('User Journey E2E Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let authToken: string;
  let merchantId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        MongooseModule.forRoot('mongodb://localhost:27017/test'),
        AppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete User Journey', () => {
    it('should complete full user journey: register -> login -> create merchant -> manage products', async () => {
      // Step 1: User Registration
      const registerData = {
        email: 'journey-test@example.com',
        password: 'password123',
        name: 'Journey Test User',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body).toHaveProperty('access_token');
      authToken = registerResponse.body.access_token;

      // Step 2: User Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body).toHaveProperty('access_token');

      // Step 3: Get User Profile
      const profileResponse = await request(app.getHttpServer())
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.email).toBe(registerData.email);

      // Step 4: Create Merchant
      const merchantData = {
        name: 'Journey Test Merchant',
        email: 'merchant@journey-test.com',
        phone: '+1234567890',
        businessType: 'retail',
        address: {
          street: '123 Journey St',
          city: 'Test City',
          country: 'Test Country',
        },
      };

      const merchantResponse = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantData);

      expect(merchantResponse.status).toBe(201);
      expect(merchantResponse.body.name).toBe(merchantData.name);
      merchantId = merchantResponse.body.id;

      // Step 5: Create Product
      const productData = {
        name: 'Journey Test Product',
        description: 'A product created during journey test',
        price: 99.99,
        category: 'electronics',
        merchantId: merchantId,
        inventory: {
          quantity: 100,
          sku: 'JTP-001',
        },
      };

      const productResponse = await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(productData);

      expect(productResponse.status).toBe(201);
      expect(productResponse.body.name).toBe(productData.name);
      expect(productResponse.body.price).toBe(productData.price);

      // Step 6: Get Products List
      const productsListResponse = await request(app.getHttpServer())
        .get(`/products?merchantId=${merchantId}&page=1&limit=10`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(productsListResponse.status).toBe(200);
      expect(productsListResponse.body.data).toHaveLength(1);
      expect(productsListResponse.body.data[0].name).toBe(productData.name);

      // Step 7: Update Product
      const updateProductData = {
        name: 'Updated Journey Test Product',
        price: 149.99,
      };

      const updateProductResponse = await request(app.getHttpServer())
        .put(`/products/${productResponse.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateProductData);

      expect(updateProductResponse.status).toBe(200);
      expect(updateProductResponse.body.name).toBe(updateProductData.name);
      expect(updateProductResponse.body.price).toBe(updateProductData.price);

      // Step 8: Get Merchant Details
      const merchantDetailsResponse = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(merchantDetailsResponse.status).toBe(200);
      expect(merchantDetailsResponse.body.id).toBe(merchantId);
      expect(merchantDetailsResponse.body.name).toBe(merchantData.name);

      // Step 9: Update Merchant
      const updateMerchantData = {
        name: 'Updated Journey Test Merchant',
        phone: '+0987654321',
      };

      const updateMerchantResponse = await request(app.getHttpServer())
        .put(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateMerchantData);

      expect(updateMerchantResponse.status).toBe(200);
      expect(updateMerchantResponse.body.name).toBe(updateMerchantData.name);
      expect(updateMerchantResponse.body.phone).toBe(updateMerchantData.phone);

      // Step 10: Delete Product
      const deleteProductResponse = await request(app.getHttpServer())
        .delete(`/products/${productResponse.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteProductResponse.status).toBe(200);
      expect(deleteProductResponse.body.success).toBe(true);

      // Step 11: Verify Product Deletion
      const verifyDeleteResponse = await request(app.getHttpServer())
        .get(`/products/${productResponse.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyDeleteResponse.status).toBe(404);

      // Step 12: Delete Merchant
      const deleteMerchantResponse = await request(app.getHttpServer())
        .delete(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteMerchantResponse.status).toBe(200);
      expect(deleteMerchantResponse.body.success).toBe(true);

      // Step 13: Verify Merchant Deletion
      const verifyMerchantDeleteResponse = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(verifyMerchantDeleteResponse.status).toBe(404);
    }, 30000); // 30 second timeout for full journey

    it('should handle authentication errors gracefully', async () => {
      // Try to access protected route without token
      const response = await request(app.getHttpServer()).get('/merchants');

      expect(response.status).toBe(401);
    });

    it('should handle invalid authentication token', async () => {
      const response = await request(app.getHttpServer())
        .get('/merchants')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should handle expired authentication token', async () => {
      // This would require a token that's actually expired
      // For now, we'll test with a malformed token
      const response = await request(app.getHttpServer())
        .get('/merchants')
        .set('Authorization', 'Bearer expired.token.here');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling in User Journey', () => {
    it('should handle validation errors during registration', async () => {
      const invalidRegisterData = {
        email: 'invalid-email',
        password: '123', // too short
        name: '', // empty name
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(invalidRegisterData);

      expect(response.status).toBe(400);
    });

    it('should handle duplicate email registration', async () => {
      const duplicateEmailData = {
        email: 'journey-test@example.com', // already registered
        password: 'password123',
        name: 'Duplicate User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(duplicateEmailData);

      expect(response.status).toBe(409); // Conflict
    });

    it('should handle invalid login credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'journey-test@example.com',
          password: 'wrong-password',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Data Consistency in User Journey', () => {
    it('should maintain data consistency across operations', async () => {
      // Create user
      const userData = {
        email: 'consistency-test@example.com',
        password: 'password123',
        name: 'Consistency Test User',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      const userToken = registerResponse.body.access_token;

      // Create merchant
      const merchantData = {
        name: 'Consistency Test Merchant',
        email: 'consistency-merchant@example.com',
        phone: '+1234567890',
      };

      const merchantResponse = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${userToken}`)
        .send(merchantData);

      expect(merchantResponse.status).toBe(201);
      const createdMerchantId = merchantResponse.body.id;

      // Verify merchant exists
      const getMerchantResponse = await request(app.getHttpServer())
        .get(`/merchants/${createdMerchantId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(getMerchantResponse.status).toBe(200);
      expect(getMerchantResponse.body.id).toBe(createdMerchantId);

      // Create multiple products
      const products = [
        {
          name: 'Product 1',
          price: 10.99,
          category: 'electronics',
          merchantId: createdMerchantId,
        },
        {
          name: 'Product 2',
          price: 20.99,
          category: 'clothing',
          merchantId: createdMerchantId,
        },
      ];

      const createdProducts: any[] = [];
      for (const productData of products) {
        const productResponse = await request(app.getHttpServer())
          .post('/products')
          .set('Authorization', `Bearer ${userToken}`)
          .send(productData);

        expect(productResponse.status).toBe(201);
        createdProducts.push(productResponse.body);
      }

      // Verify all products exist
      const productsListResponse = await request(app.getHttpServer())
        .get(`/products?merchantId=${createdMerchantId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(productsListResponse.status).toBe(200);
      expect(productsListResponse.body.data).toHaveLength(2);

      // Clean up
      for (const product of createdProducts) {
        await request(app.getHttpServer())
          .delete(`/products/${product.id}`)
          .set('Authorization', `Bearer ${userToken}`);
      }

      await request(app.getHttpServer())
        .delete(`/merchants/${createdMerchantId}`)
        .set('Authorization', `Bearer ${userToken}`);
    }, 20000);
  });
});
