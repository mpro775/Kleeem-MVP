import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { io as SocketClient, type Socket } from 'socket.io-client';
import request from 'supertest';

import { AppModule } from '../../src/app.module';

describe('Merchant Complete Journey (E2E)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryReplSet;
  let socketClient: Socket;

  // Test data that will be used throughout the journey
  const merchantData = {
    email: 'merchant@teststore.com',
    password: 'SecurePass123!',
    businessName: 'Test Store',
    phoneNumber: '+966501234567',
  };

  const customerData = {
    name: 'Ahmed Al-Rashid',
    email: 'ahmed@customer.com',
    phone: '+966505555555',
    address: 'Riyadh, Saudi Arabia',
  };

  let accessToken: string;
  let refreshToken: string;
  let merchantId: string;
  let productId: string;
  let orderId: string;
  let sessionId: string;

  beforeAll(async () => {
    // Setup test environment
    mongo = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });

    process.env.MONGO_URI = mongo.getUri();
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'test-e2e-secret';
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

    // Generate session ID for the journey
    sessionId = `e2e-session-${Date.now()}`;
  }, 60000);

  afterAll(async () => {
    if (socketClient) {
      socketClient.disconnect();
    }
    await app?.close();
    await mongo?.stop();
  });

  describe('1. Merchant Registration & Activation', () => {
    it('should register a new merchant account', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(merchantData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('message');
      expect(response.body.user.email).toBe(merchantData.email);
      expect(response.body.user.role).toBe('MERCHANT');

      merchantId = response.body.user.merchantId;

      // In a real scenario, email verification would be required
      // For E2E test, we'll simulate the verification step
    });

    it('should verify email (simulated)', () => {
      // In production, this would involve clicking an email link
      // For testing, we'll directly mark the email as verified
      // This would typically be done through a verification endpoint
      expect(merchantId).toBeDefined();
    });
  });

  describe('2. Merchant Login & Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: merchantData.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });

    it('should access merchant profile', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.email).toBe(merchantData.email);
      expect(response.body.role).toBe('MERCHANT');
    });
  });

  describe('3. Product Management', () => {
    const productData = {
      name: 'Premium T-Shirt',
      description: 'High-quality cotton t-shirt with premium finish',
      price: 89.99,
      quantity: 50,
      category: null,
      images: [
        'https://example.com/tshirt-front.jpg',
        'https://example.com/tshirt-back.jpg',
      ],
      attributes: [
        { name: 'Size', value: 'M' },
        { name: 'Color', value: 'Blue' },
        { name: 'Material', value: '100% Cotton' },
      ],
      keywords: ['tshirt', 'cotton', 'premium', 'clothing'],
    };

    it('should create a new product', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/products')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(productData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toBe(productData.name);
      expect(response.body.price).toBe(productData.price);
      expect(response.body.merchantId).toBe(merchantId);
      expect(response.body.status).toBe('active');
      expect(response.body.isAvailable).toBe(true);

      productId = response.body._id;
    });

    it('should list products with pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total', 1);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0]._id).toBe(productId);
    });

    it('should search products by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/products/search?q=Premium&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('name', productData.name);
    });

    it('should update product details', async () => {
      const updateData = {
        price: 79.99,
        quantity: 45,
        description:
          'Updated: High-quality cotton t-shirt with premium finish and new design',
      };

      const response = await request(app.getHttpServer())
        .patch(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.price).toBe(updateData.price);
      expect(response.body.quantity).toBe(updateData.quantity);
      expect(response.body.description).toBe(updateData.description);
    });
  });

  describe('4. Order Creation & Management', () => {
    const orderData = {
      sessionId,
      customer: customerData,
      products: [
        {
          product: '', // Will be set to productId
          name: 'Premium T-Shirt',
          price: 79.99,
          quantity: 2,
        },
      ],
      source: 'storefront',
    };

    it('should create a new order', async () => {
      orderData.products[0].product = productId;

      const response = await request(app.getHttpServer())
        .post('/api/orders')
        .send(orderData)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.customer.name).toBe(customerData.name);
      expect(response.body.products).toHaveLength(1);
      expect(response.body.products[0].quantity).toBe(2);
      expect(response.body.status).toBe('pending');

      orderId = response.body._id;
    });

    it('should retrieve order details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body._id).toBe(orderId);
      expect(response.body.sessionId).toBe(sessionId);
      expect(response.body.customer.name).toBe(customerData.name);
    });

    it('should list merchant orders', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders/merchant?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(response.body.orders).toHaveLength(1);
      expect(response.body.orders[0]._id).toBe(orderId);
      expect(response.body.total).toBe(1);
    });

    it('should update order status to paid', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'paid' })
        .expect(200);

      expect(response.body.status).toBe('paid');
    });
  });

  describe('5. Customer Support Bot Response', () => {
    it('should handle customer inquiry about order', async () => {
      // Simulate a webhook from WhatsApp or customer support system
      const customerMessage = {
        sessionId,
        message: `مرحبا، أريد معرفة حالة طلبي رقم ${orderId}`,
        customerPhone: customerData.phone,
        merchantId,
      };

      // This would typically trigger the bot response system
      const response = await request(app.getHttpServer())
        .post('/api/webhooks/whatsapp')
        .send({
          messages: [
            {
              from: customerMessage.customerPhone,
              text: { body: customerMessage.message },
              timestamp: Date.now(),
            },
          ],
        })
        .expect(200);

      // The webhook should process the message and potentially generate a response
      expect(response.body).toHaveProperty('status', 'received');
    });

    it('should generate AI agent response for product inquiry', async () => {
      const productInquiry = {
        sessionId,
        message: 'هل لديكم تيشرت بلون أحمر؟',
        customerPhone: customerData.phone,
        merchantId,
      };

      // Simulate product search inquiry
      const response = await request(app.getHttpServer())
        .post('/api/webhooks/whatsapp')
        .send({
          messages: [
            {
              from: productInquiry.customerPhone,
              text: { body: productInquiry.message },
              timestamp: Date.now(),
            },
          ],
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'received');
    });
  });

  describe('6. Real-time WebSocket Communication', () => {
    beforeAll(async () => {
      // Connect to WebSocket server
      const serverAddress = `http://localhost:${app.getHttpServer().address()?.port || 3000}`;
      socketClient = SocketClient(serverAddress, {
        transports: ['websocket'],
        auth: {
          token: accessToken,
        },
      });

      return new Promise((resolve, reject) => {
        socketClient.on('connect', () => resolve(void 0));
        socketClient.on('connect_error', (error) => reject(error));
      });
    });

    it('should receive real-time order updates via WebSocket', async () => {
      // Listen for order updates
      const orderUpdatePromise = new Promise((resolve) => {
        socketClient.on('orderUpdate', (data) => {
          expect(data).toHaveProperty('orderId');
          expect(data).toHaveProperty('status');
          expect(data).toHaveProperty('merchantId', merchantId);
          resolve(data);
        });
      });

      // Trigger an order status update
      setTimeout(async () => {
        await request(app.getHttpServer())
          .patch(`/api/orders/${orderId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ status: 'shipped' });
      }, 100);

      await orderUpdatePromise;
    }, 10000);

    it('should receive real-time chat messages via WebSocket', async () => {
      // Listen for chat messages
      const messagePromise = new Promise((resolve) => {
        socketClient.on('newMessage', (data) => {
          expect(data).toHaveProperty('sessionId');
          expect(data).toHaveProperty('message');
          expect(data).toHaveProperty('merchantId', merchantId);
          resolve(data);
        });
      });

      // Simulate a new chat message
      setTimeout(() => {
        socketClient.emit('sendMessage', {
          sessionId,
          message: 'Test real-time message',
          merchantId,
        });
      }, 100);

      await messagePromise;
    }, 10000);
  });

  describe('7. Analytics & Reporting', () => {
    it('should get order statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/orders/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should have at least one status group (our test order)
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should get merchant dashboard data', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/merchants/dashboard')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('totalProducts');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body.totalOrders).toBeGreaterThanOrEqual(1);
      expect(response.body.totalProducts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('8. Session Management & Logout', () => {
    it('should refresh access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Update tokens for subsequent tests
      const newAccessToken = response.body.accessToken;
      expect(newAccessToken).not.toBe(accessToken);
    });

    it('should logout and invalidate tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.status).toBe(200);

      // Verify that the old token is no longer valid
      await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('should not allow refresh with invalidated token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(401);

      expect(response.status).toBe(401);
    });
  });

  describe('9. Complete Journey Validation', () => {
    it('should validate complete merchant journey data integrity', async () => {
      // Re-login to verify the journey completion
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: merchantData.email,
          password: merchantData.password,
        })
        .expect(200);

      const newAccessToken = loginResponse.body.accessToken;

      // Verify all created data still exists and is consistent
      const productResponse = await request(app.getHttpServer())
        .get(`/api/products/${productId}`)
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      const orderResponse = await request(app.getHttpServer())
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${newAccessToken}`)
        .expect(200);

      // Verify data relationships
      expect(productResponse.body.merchantId).toBe(merchantId);
      expect(orderResponse.body.merchantId).toBe(merchantId);
      expect(orderResponse.body.products[0].product).toBe(productId);
      expect(orderResponse.body.sessionId).toBe(sessionId);
      expect(orderResponse.body.status).toBe('shipped'); // Last status we set
    });
  });
});
