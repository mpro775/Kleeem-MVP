import { type INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('Merchant Onboarding E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let merchantId: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Complete Merchant Onboarding Flow', () => {
    it('should complete full merchant onboarding process', async () => {
      // Step 1: User Registration
      const registerDto = {
        email: 'merchant@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '+1234567890',
      };

      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(registerResponse.body).toMatchObject({
        message: expect.stringContaining('registered'),
        user: expect.objectContaining({
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        }),
      });

      const userId = registerResponse.body.user.id;

      // Step 2: Email Verification
      await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'mock-verification-token' })
        .expect(200);

      // Step 3: User Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      expect(loginResponse.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          email: registerDto.email,
        }),
      });

      authToken = loginResponse.body.accessToken;

      // Step 4: Create Merchant Profile
      const merchantDto = {
        businessName: 'Test Business',
        businessType: 'retail',
        description: 'A test retail business',
        address: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          country: 'USA',
          postalCode: '10001',
        },
        phoneNumber: '+1234567890',
        website: 'https://testbusiness.com',
        taxId: 'TAX123456789',
        bankAccount: {
          accountNumber: '1234567890',
          routingNumber: '987654321',
          accountHolderName: 'Test Business',
        },
      };

      const merchantResponse = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantDto)
        .expect(201);

      expect(merchantResponse.body).toMatchObject({
        businessName: merchantDto.businessName,
        businessType: merchantDto.businessType,
        status: 'pending_verification',
        userId: userId,
      });

      merchantId = merchantResponse.body.id;

      // Step 5: Upload Business Documents
      const documentResponse = await request(app.getHttpServer())
        .post(`/merchants/${merchantId}/documents`)
        .set('Authorization', `Bearer ${authToken}`)
        .attach(
          'businessLicense',
          Buffer.from('mock license content'),
          'license.pdf',
        )
        .attach('taxCertificate', Buffer.from('mock tax content'), 'tax.pdf')
        .expect(201);

      expect(documentResponse.body).toMatchObject({
        message: 'Documents uploaded successfully',
        documents: expect.arrayContaining([
          expect.objectContaining({
            type: 'business_license',
            status: 'pending_review',
          }),
          expect.objectContaining({
            type: 'tax_certificate',
            status: 'pending_review',
          }),
        ]),
      });

      // Step 6: Setup Business Categories
      const categoriesResponse = await request(app.getHttpServer())
        .post(`/merchants/${merchantId}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          categories: ['electronics', 'computers', 'accessories'],
        })
        .expect(201);

      expect(categoriesResponse.body).toMatchObject({
        message: 'Categories updated successfully',
        categories: expect.arrayContaining([
          'electronics',
          'computers',
          'accessories',
        ]),
      });

      // Step 7: Configure Payment Methods
      const paymentResponse = await request(app.getHttpServer())
        .post(`/merchants/${merchantId}/payment-methods`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          methods: ['credit_card', 'paypal', 'bank_transfer'],
          defaultMethod: 'credit_card',
        })
        .expect(201);

      expect(paymentResponse.body).toMatchObject({
        message: 'Payment methods configured successfully',
        paymentMethods: expect.arrayContaining([
          'credit_card',
          'paypal',
          'bank_transfer',
        ]),
        defaultMethod: 'credit_card',
      });

      // Step 8: Setup Shipping Options
      const shippingResponse = await request(app.getHttpServer())
        .post(`/merchants/${merchantId}/shipping`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          options: [
            {
              name: 'Standard Shipping',
              cost: 5.99,
              estimatedDays: 3,
              freeThreshold: 50.0,
            },
            {
              name: 'Express Shipping',
              cost: 12.99,
              estimatedDays: 1,
            },
          ],
        })
        .expect(201);

      expect(shippingResponse.body).toMatchObject({
        message: 'Shipping options configured successfully',
        shippingOptions: expect.arrayContaining([
          expect.objectContaining({
            name: 'Standard Shipping',
            cost: 5.99,
          }),
          expect.objectContaining({
            name: 'Express Shipping',
            cost: 12.99,
          }),
        ]),
      });

      // Step 9: Configure Store Settings
      const settingsResponse = await request(app.getHttpServer())
        .put(`/merchants/${merchantId}/settings`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
          notifications: {
            email: true,
            sms: false,
            push: true,
          },
          autoAcceptOrders: true,
          requireApproval: false,
        })
        .expect(200);

      expect(settingsResponse.body).toMatchObject({
        message: 'Settings updated successfully',
        settings: expect.objectContaining({
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'en',
        }),
      });

      // Step 10: Verify Merchant Profile
      const profileResponse = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body).toMatchObject({
        id: merchantId,
        businessName: merchantDto.businessName,
        businessType: merchantDto.businessType,
        status: 'pending_verification',
        categories: expect.arrayContaining([
          'electronics',
          'computers',
          'accessories',
        ]),
        paymentMethods: expect.arrayContaining([
          'credit_card',
          'paypal',
          'bank_transfer',
        ]),
        shippingOptions: expect.arrayContaining([
          expect.objectContaining({ name: 'Standard Shipping' }),
        ]),
        settings: expect.objectContaining({
          currency: 'USD',
          timezone: 'America/New_York',
        }),
      });

      // Step 11: Check Onboarding Status
      const statusResponse = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}/onboarding-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        completed: false,
        progress: expect.any(Number),
        steps: expect.objectContaining({
          profile: true,
          documents: true,
          categories: true,
          payment: true,
          shipping: true,
          settings: true,
          verification: false,
        }),
        nextSteps: expect.arrayContaining(['verification']),
      });
    });

    it('should handle incomplete onboarding gracefully', async () => {
      // Create user and login
      const registerDto = {
        email: 'incomplete@example.com',
        password: 'SecurePass123!',
        confirmPassword: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567891',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: registerDto.email,
          password: registerDto.password,
        })
        .expect(200);

      const authToken = loginResponse.body.accessToken;

      // Create partial merchant profile
      const merchantDto = {
        businessName: 'Partial Business',
        businessType: 'retail',
        description: 'A partially set up business',
        address: {
          street: '456 Oak Ave',
          city: 'Los Angeles',
          state: 'CA',
          country: 'USA',
          postalCode: '90210',
        },
      };

      const merchantResponse = await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(merchantDto)
        .expect(201);

      const merchantId = merchantResponse.body.id;

      // Check incomplete status
      const statusResponse = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}/onboarding-status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statusResponse.body).toMatchObject({
        completed: false,
        progress: expect.any(Number),
        steps: expect.objectContaining({
          profile: true,
          documents: false,
          categories: false,
          payment: false,
          shipping: false,
          settings: false,
          verification: false,
        }),
        nextSteps: expect.arrayContaining(['documents', 'categories']),
      });

      // Attempt to access merchant features before completion
      await request(app.getHttpServer())
        .get(`/merchants/${merchantId}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      // Complete remaining steps
      await request(app.getHttpServer())
        .post(`/merchants/${merchantId}/categories`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ categories: ['clothing'] })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/merchants/${merchantId}/payment-methods`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ methods: ['credit_card'] })
        .expect(201);

      // Now should be able to access dashboard
      const dashboardResponse = await request(app.getHttpServer())
        .get(`/merchants/${merchantId}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(dashboardResponse.body).toMatchObject({
        merchantId: merchantId,
        status: 'active',
      });
    });

    it('should validate business requirements', async () => {
      // Test invalid business type
      const invalidMerchantDto = {
        businessName: 'Test Business',
        businessType: 'invalid_type',
        description: 'Test description',
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'merchant@example.com',
          password: 'SecurePass123!',
        })
        .expect(200);

      const authToken = loginResponse.body.accessToken;

      await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidMerchantDto)
        .expect(400);

      // Test missing required fields
      const incompleteMerchantDto = {
        businessName: 'Test Business',
        // Missing businessType and description
      };

      await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteMerchantDto)
        .expect(400);

      // Test invalid address format
      const invalidAddressDto = {
        businessName: 'Test Business',
        businessType: 'retail',
        description: 'Test description',
        address: {
          street: '123 Main St',
          // Missing city, state, country
        },
      };

      await request(app.getHttpServer())
        .post('/merchants')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAddressDto)
        .expect(400);
    });
  });
});
